"""
LUMEN CV Knowledge Distillation — Compress a large teacher model into a small student.
Uses KL-divergence + cross-entropy combined loss with temperature scaling.
"""
import os
from typing import Any, Callable, Dict, Optional

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from app.services.cv.model_loader import ModelLoader


class DistillationLoss(nn.Module):
    """Combined KL-divergence (soft labels) + Cross-Entropy (hard labels) loss."""

    def __init__(self, temperature: float = 4.0, alpha: float = 0.7):
        super().__init__()
        self.temperature = temperature
        self.alpha = alpha
        self.kl_loss = nn.KLDivLoss(reduction="batchmean")
        self.ce_loss = nn.CrossEntropyLoss()

    def forward(self, student_logits, teacher_logits, labels):
        T = self.temperature
        soft_student = nn.functional.log_softmax(student_logits / T, dim=1)
        soft_teacher = nn.functional.softmax(teacher_logits / T, dim=1)
        kl = self.kl_loss(soft_student, soft_teacher) * (T * T)
        ce = self.ce_loss(student_logits, labels)
        return self.alpha * kl + (1 - self.alpha) * ce


def distill(
    teacher_slug: str,
    student_slug: str,
    train_loader: DataLoader,
    val_loader: DataLoader,
    num_classes: int,
    epochs: int = 20,
    temperature: float = 4.0,
    alpha: float = 0.7,
    lr: float = 1e-3,
    device: str = "cpu",
    progress_callback: Optional[Callable[[float, Dict], None]] = None,
) -> Dict[str, Any]:
    """
    Run knowledge distillation from teacher to student.
    The teacher is frozen; only the student is trained.
    """
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch is required for distillation")

    loader = ModelLoader()

    # Load teacher (frozen)
    teacher_loaded = loader.load_model(teacher_slug, num_classes=num_classes, device=device)
    teacher = teacher_loaded.model
    teacher.eval()
    for p in teacher.parameters():
        p.requires_grad = False

    # Load student (trainable)
    student_loaded = loader.load_model(student_slug, num_classes=num_classes, device=device)
    student = student_loaded.model
    student.train()

    # Unload from cache to avoid memory issues
    loader.unload_model(teacher_slug)
    loader.unload_model(student_slug)

    teacher = teacher.to(device)
    student = student.to(device)

    criterion = DistillationLoss(temperature=temperature, alpha=alpha)
    optimizer = optim.AdamW(student.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {"train_loss": [], "val_accuracy": []}
    best_val_acc = 0.0
    best_state = None

    for epoch in range(epochs):
        # --- Train ---
        student.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            with torch.no_grad():
                teacher_out = teacher(images)
                if isinstance(teacher_out, dict):
                    teacher_out = list(teacher_out.values())[0]
            student_out = student(images)
            if isinstance(student_out, dict):
                student_out = list(student_out.values())[0]
            loss = criterion(student_out, teacher_out, labels)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        avg_loss = running_loss / max(len(train_loader), 1)
        history["train_loss"].append(round(avg_loss, 4))

        # --- Validate ---
        student.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                out = student(images)
                if isinstance(out, dict):
                    out = list(out.values())[0]
                _, pred = torch.max(out, 1)
                total += labels.size(0)
                correct += (pred == labels).sum().item()

        val_acc = correct / max(total, 1) * 100
        history["val_accuracy"].append(round(val_acc, 2))

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in student.state_dict().items()}

        scheduler.step()

        if progress_callback:
            progress_callback((epoch + 1) / epochs, {
                "epoch": epoch + 1, "train_loss": avg_loss, "val_accuracy": val_acc,
            })

    if best_state:
        student.load_state_dict(best_state)

    return {
        "teacher_model": teacher_slug,
        "student_model": student_slug,
        "best_val_accuracy": round(best_val_acc, 2),
        "total_epochs": len(history["train_loss"]),
        "temperature": temperature,
        "alpha": alpha,
        "history": history,
    }
