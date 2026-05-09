"""
LUMEN CV Fine-Tuner — Transfer learning pipeline for adapting pre-trained models.
Supports Lightweight (head-only), Full (unfreeze last N layers), and LoRA modes.
Designed to run as a Celery async task with progress callbacks.
"""
import os
import time
import zipfile
import shutil
from typing import Any, Callable, Dict, List, Optional, Tuple

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader
    from torchvision import datasets, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from app.services.cv.model_loader import ModelLoader


def prepare_dataset(
    zip_path: str,
    target_size: int = 224,
    batch_size: int = 32,
    extract_dir: Optional[str] = None,
) -> Tuple[DataLoader, DataLoader, List[str], int]:
    """
    Extract a zip of labeled images and create train/val DataLoaders.
    Expected zip structure: train/class_a/*.jpg, train/class_b/*.jpg, [val/...]
    Returns: (train_loader, val_loader, class_names, num_classes)
    """
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch is required for fine-tuning")

    if extract_dir is None:
        extract_dir = zip_path.replace(".zip", "_extracted")

    if os.path.exists(extract_dir):
        shutil.rmtree(extract_dir)

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    # Find train directory
    train_dir = os.path.join(extract_dir, "train")
    if not os.path.isdir(train_dir):
        # Maybe images are directly in extract_dir with class subdirectories
        subdirs = [d for d in os.listdir(extract_dir) if os.path.isdir(os.path.join(extract_dir, d))]
        if subdirs and not any(d in ("train", "val", "test") for d in subdirs):
            train_dir = extract_dir
        else:
            # Look one level deeper
            for d in subdirs:
                candidate = os.path.join(extract_dir, d, "train")
                if os.path.isdir(candidate):
                    train_dir = candidate
                    break

    # Augmentation for training
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(target_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((target_size, target_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    class_names = train_dataset.classes
    num_classes = len(class_names)

    # Check for val directory
    val_dir = os.path.join(os.path.dirname(train_dir), "val")
    if os.path.isdir(val_dir):
        val_dataset = datasets.ImageFolder(val_dir, transform=val_transform)
    else:
        # Split train into 80/20
        train_size = int(0.8 * len(train_dataset))
        val_size = len(train_dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(
            train_dataset, [train_size, val_size]
        )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=True)

    return train_loader, val_loader, class_names, num_classes


def build_finetune_model(
    base_slug: str,
    num_classes: int,
    mode: str = "lightweight",
    device: str = "cpu",
) -> nn.Module:
    """
    Build a model for fine-tuning from a pre-trained base.
    mode: "lightweight" (head only), "full" (unfreeze last layers), "lora" (low-rank adapters)
    """
    loader = ModelLoader()
    loaded = loader.load_model(base_slug, num_classes=num_classes, device=device)
    model = loaded.model

    if mode == "lightweight":
        # Freeze everything
        for param in model.parameters():
            param.requires_grad = False
        # Unfreeze the classification head
        _unfreeze_head(model, base_slug)

    elif mode == "full":
        # Freeze early layers, unfreeze last ~10 layers
        all_params = list(model.named_parameters())
        freeze_until = max(0, len(all_params) - 20)
        for i, (name, param) in enumerate(all_params):
            param.requires_grad = (i >= freeze_until)

    elif mode == "lora":
        # Lightweight LoRA: freeze all, then inject trainable low-rank matrices
        for param in model.parameters():
            param.requires_grad = False
        _unfreeze_head(model, base_slug)
        # Add LoRA-style adapters to last few conv/linear layers
        _inject_lora_adapters(model, rank=4)

    # Unload from loader cache to avoid conflicts
    loader.unload_model(base_slug)
    return model


def _unfreeze_head(model: nn.Module, slug: str):
    """Unfreeze classification head based on architecture."""
    if hasattr(model, "fc"):
        for p in model.fc.parameters():
            p.requires_grad = True
    if hasattr(model, "classifier"):
        for p in model.classifier.parameters():
            p.requires_grad = True
    if hasattr(model, "head"):
        for p in model.head.parameters():
            p.requires_grad = True


def _inject_lora_adapters(model: nn.Module, rank: int = 4):
    """Inject trainable low-rank adapters into Linear layers."""
    for name, module in model.named_modules():
        if isinstance(module, nn.Linear) and module.out_features > 100:
            # Add parallel low-rank path
            in_f, out_f = module.in_features, module.out_features
            lora_down = nn.Linear(in_f, rank, bias=False)
            lora_up = nn.Linear(rank, out_f, bias=False)
            nn.init.zeros_(lora_up.weight)
            lora_down.requires_grad_(True)
            lora_up.requires_grad_(True)
            # Store as sub-modules (they'll be picked up by optimizer)
            setattr(model, f"_lora_down_{name.replace('.', '_')}", lora_down)
            setattr(model, f"_lora_up_{name.replace('.', '_')}", lora_up)


def train_loop(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 10,
    lr: float = 1e-3,
    device: str = "cpu",
    progress_callback: Optional[Callable[[float, Dict], None]] = None,
    patience: int = 5,
) -> Dict[str, Any]:
    """
    Training loop with early stopping and cosine LR scheduler.
    progress_callback(progress_fraction, metrics_dict) is called after each epoch.
    """
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()

    # Only optimize trainable parameters
    trainable = [p for p in model.parameters() if p.requires_grad]
    optimizer = optim.AdamW(trainable, lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_acc = 0.0
    best_state = None
    epochs_no_improve = 0
    history = {"train_loss": [], "val_loss": [], "val_accuracy": [], "lr": []}

    for epoch in range(epochs):
        # --- Train ---
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            if isinstance(outputs, dict):
                outputs = outputs.get("logits", outputs.get("out", list(outputs.values())[0]))
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        avg_train_loss = running_loss / max(len(train_loader), 1)

        # --- Validate ---
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                if isinstance(outputs, dict):
                    outputs = outputs.get("logits", outputs.get("out", list(outputs.values())[0]))
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        avg_val_loss = val_loss / max(len(val_loader), 1)
        val_acc = correct / max(total, 1) * 100

        scheduler.step()
        current_lr = scheduler.get_last_lr()[0]

        history["train_loss"].append(round(avg_train_loss, 4))
        history["val_loss"].append(round(avg_val_loss, 4))
        history["val_accuracy"].append(round(val_acc, 2))
        history["lr"].append(round(current_lr, 6))

        # Early stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1

        progress = (epoch + 1) / epochs
        if progress_callback:
            progress_callback(progress, {
                "epoch": epoch + 1, "train_loss": avg_train_loss,
                "val_loss": avg_val_loss, "val_accuracy": val_acc, "lr": current_lr,
            })

        if epochs_no_improve >= patience:
            break

    # Restore best weights
    if best_state:
        model.load_state_dict(best_state)

    return {
        "best_val_accuracy": round(best_val_acc, 2),
        "total_epochs_run": len(history["train_loss"]),
        "history": history,
    }


def save_finetuned_model(
    model: nn.Module,
    save_dir: str,
    metadata: Dict[str, Any],
) -> str:
    """Save fine-tuned model weights and metadata."""
    os.makedirs(save_dir, exist_ok=True)
    weights_path = os.path.join(save_dir, "model_weights.pth")
    torch.save(model.state_dict(), weights_path)

    import json
    meta_path = os.path.join(save_dir, "metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2, default=str)

    return weights_path
