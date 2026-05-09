"""
LUMEN CV Model Loader — Unified interface for loading any registered model.
Supports torchvision, timm, ultralytics, and transformers backends.
Includes LRU caching to limit GPU/RAM memory usage.
"""
import threading
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import torchvision.models as tv_models
    import torchvision.transforms as T
    TORCHVISION_AVAILABLE = True
except ImportError:
    TORCHVISION_AVAILABLE = False

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

from app.services.cv.model_registry import MODEL_CATALOG, ModelEntry


class LoadedModel:
    """
    Wrapper around any loaded CV model, providing a unified prediction interface.
    """

    def __init__(self, model: Any, entry: ModelEntry, device: str = "cpu",
                 transform: Any = None, num_classes: Optional[int] = None):
        self.model = model
        self.entry = entry
        self.device = device
        self.transform = transform
        self.num_classes = num_classes
        self._model_info = entry.to_dict()

    @property
    def model_info(self) -> Dict[str, Any]:
        return self._model_info

    def predict(self, image: Any) -> Dict[str, Any]:
        """
        Run inference on a single image.
        - image: PIL Image, numpy array, or file path (for YOLO).
        Returns a standardized result dict.
        """
        if self.entry.task_type == "detection" and self.entry.source == "ultralytics":
            return self._predict_yolo(image)
        elif self.entry.task_type == "segmentation":
            return self._predict_segmentation(image)
        else:
            return self._predict_classification(image)

    def predict_proba(self, image: Any) -> np.ndarray:
        """
        Return raw probability distribution (classification only).
        """
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required for probability predictions")

        tensor = self._prepare_tensor(image)
        self.model.eval()
        with torch.no_grad():
            output = self.model(tensor)
            probs = torch.nn.functional.softmax(output, dim=1)
        return probs.cpu().numpy()[0]

    # ---- Private prediction methods ----

    def _predict_classification(self, image: Any) -> Dict[str, Any]:
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required")

        tensor = self._prepare_tensor(image)
        self.model.eval()
        with torch.no_grad():
            output = self.model(tensor)
            probs = torch.nn.functional.softmax(output, dim=1)
            top5_probs, top5_indices = torch.topk(probs, min(5, probs.shape[1]))

        predictions = []
        for prob, idx in zip(top5_probs[0], top5_indices[0]):
            predictions.append({
                "class_id": idx.item(),
                "confidence": round(prob.item(), 4),
            })

        return {
            "task": "classification",
            "model": self.entry.slug,
            "predictions": predictions,
            "top_prediction": predictions[0] if predictions else None,
        }

    def _predict_yolo(self, image: Any) -> Dict[str, Any]:
        results = self.model.predict(source=image, conf=0.25, save=False, verbose=False)
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                coords = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls_id = int(box.cls[0].item())
                cls_name = self.model.names[cls_id]
                detections.append({
                    "class": cls_name,
                    "class_id": cls_id,
                    "confidence": round(conf, 4),
                    "bbox": [round(c, 2) for c in coords],
                })

        return {
            "task": "detection",
            "model": self.entry.slug,
            "detections": detections,
            "count": len(detections),
        }

    def _predict_segmentation(self, image: Any) -> Dict[str, Any]:
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required")

        tensor = self._prepare_tensor(image)
        self.model.eval()
        with torch.no_grad():
            output = self.model(tensor)
            # torchvision segmentation models return OrderedDict
            if isinstance(output, dict):
                output = output["out"]
            mask = torch.argmax(output.squeeze(), dim=0).cpu().numpy()

        unique_classes = np.unique(mask).tolist()
        return {
            "task": "segmentation",
            "model": self.entry.slug,
            "mask": mask.tolist(),
            "num_classes_found": len(unique_classes),
            "class_ids": unique_classes,
        }

    def _prepare_tensor(self, image: Any) -> "torch.Tensor":
        """Convert image input to a batched tensor on the correct device."""
        from PIL import Image as PILImage

        if isinstance(image, str):
            image = PILImage.open(image).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = PILImage.fromarray(image)

        if self.transform is not None:
            tensor = self.transform(image)
        else:
            # Default transform
            default_transform = T.Compose([
                T.Resize((self.entry.input_size, self.entry.input_size)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            tensor = default_transform(image)

        if tensor.dim() == 3:
            tensor = tensor.unsqueeze(0)

        return tensor.to(self.device)


class ModelLoader:
    """
    Singleton model loader with LRU cache to limit memory.
    Thread-safe for concurrent API requests.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, max_cache_size: int = 3):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._cache: OrderedDict[str, LoadedModel] = OrderedDict()
                    cls._instance._max_cache_size = max_cache_size
        return cls._instance

    def load_model(
        self,
        slug: str,
        num_classes: Optional[int] = None,
        device: str = "cpu",
    ) -> LoadedModel:
        """
        Load a model by slug. Returns cached version if available.
        """
        cache_key = f"{slug}_{num_classes}_{device}"

        if cache_key in self._cache:
            # Move to end (most recently used)
            self._cache.move_to_end(cache_key)
            return self._cache[cache_key]

        entry = MODEL_CATALOG.get(slug)
        if entry is None:
            raise ValueError(f"Model '{slug}' not found in registry. "
                             f"Available: {list(MODEL_CATALOG.keys())}")

        loaded = self._build_model(entry, num_classes, device)

        # Evict oldest if cache is full
        while len(self._cache) >= self._max_cache_size:
            evicted_key, evicted_model = self._cache.popitem(last=False)
            self._cleanup_model(evicted_model)

        self._cache[cache_key] = loaded
        return loaded

    def unload_model(self, slug: str) -> bool:
        """Remove a specific model from cache."""
        keys_to_remove = [k for k in self._cache if k.startswith(slug)]
        for key in keys_to_remove:
            model = self._cache.pop(key)
            self._cleanup_model(model)
        return len(keys_to_remove) > 0

    def get_loaded_models(self) -> List[str]:
        """Return slugs of currently cached models."""
        return [key.split("_")[0] for key in self._cache.keys()]

    def clear_cache(self):
        """Remove all cached models and free memory."""
        for model in self._cache.values():
            self._cleanup_model(model)
        self._cache.clear()

    # ---- Private build methods ----

    def _build_model(
        self,
        entry: ModelEntry,
        num_classes: Optional[int],
        device: str,
    ) -> LoadedModel:
        """Dispatch to the correct loader based on model source."""
        if entry.source == "ultralytics":
            return self._load_ultralytics(entry, device)
        elif entry.source == "torchvision":
            return self._load_torchvision(entry, num_classes, device)
        elif entry.source == "timm":
            return self._load_timm(entry, num_classes, device)
        else:
            raise ValueError(f"Unsupported model source: {entry.source}")

    def _load_torchvision(
        self, entry: ModelEntry, num_classes: Optional[int], device: str
    ) -> LoadedModel:
        if not TORCHVISION_AVAILABLE:
            raise ImportError("torchvision is required to load this model")

        model = None
        backbone = entry.backbone

        # --- Classification models ---
        if entry.task_type == "classification":
            weight_map = {
                "resnet50": (tv_models.resnet50, tv_models.ResNet50_Weights.DEFAULT),
                "resnet101": (tv_models.resnet101, tv_models.ResNet101_Weights.DEFAULT),
                "resnet152": (tv_models.resnet152, tv_models.ResNet152_Weights.DEFAULT),
                "mobilenetv3_small": (tv_models.mobilenet_v3_small, tv_models.MobileNet_V3_Small_Weights.DEFAULT),
                "mobilenetv3_large": (tv_models.mobilenet_v3_large, tv_models.MobileNet_V3_Large_Weights.DEFAULT),
                "densenet121": (tv_models.densenet121, tv_models.DenseNet121_Weights.DEFAULT),
                "densenet169": (tv_models.densenet169, tv_models.DenseNet169_Weights.DEFAULT),
                "inception_v3": (tv_models.inception_v3, tv_models.Inception_V3_Weights.DEFAULT),
            }
            if backbone in weight_map:
                fn, weights = weight_map[backbone]
                model = fn(weights=weights)

                # Replace classification head if custom num_classes
                if num_classes is not None:
                    model = self._replace_head(model, backbone, num_classes)

        # --- Detection models ---
        elif entry.task_type == "detection":
            if backbone == "fasterrcnn_resnet50_fpn":
                from torchvision.models.detection import fasterrcnn_resnet50_fpn, FasterRCNN_ResNet50_FPN_Weights
                model = fasterrcnn_resnet50_fpn(weights=FasterRCNN_ResNet50_FPN_Weights.DEFAULT)

        # --- Segmentation models ---
        elif entry.task_type == "segmentation":
            if backbone == "deeplabv3_resnet50":
                from torchvision.models.segmentation import deeplabv3_resnet50, DeepLabV3_ResNet50_Weights
                model = deeplabv3_resnet50(weights=DeepLabV3_ResNet50_Weights.DEFAULT)
            elif backbone == "deeplabv3_mobilenet_v3_large":
                from torchvision.models.segmentation import deeplabv3_mobilenet_v3_large, DeepLabV3_MobileNet_V3_Large_Weights
                model = deeplabv3_mobilenet_v3_large(weights=DeepLabV3_MobileNet_V3_Large_Weights.DEFAULT)
            elif backbone == "maskrcnn_resnet50_fpn":
                from torchvision.models.detection import maskrcnn_resnet50_fpn, MaskRCNN_ResNet50_FPN_Weights
                model = maskrcnn_resnet50_fpn(weights=MaskRCNN_ResNet50_FPN_Weights.DEFAULT)

        if model is None:
            raise ValueError(f"Could not load torchvision model: {backbone}")

        model = model.to(device)
        model.eval()

        transform = self._get_default_transform(entry.input_size)
        return LoadedModel(model, entry, device, transform, num_classes)

    def _load_timm(
        self, entry: ModelEntry, num_classes: Optional[int], device: str
    ) -> LoadedModel:
        if not TIMM_AVAILABLE:
            raise ImportError("timm is required to load this model. Install: pip install timm")

        model = timm.create_model(
            entry.backbone,
            pretrained=True,
            num_classes=num_classes or 1000,
        )
        model = model.to(device)
        model.eval()

        # Use timm's recommended transform
        data_config = timm.data.resolve_model_data_config(model)
        transform = timm.data.create_transform(**data_config, is_training=False)

        return LoadedModel(model, entry, device, transform, num_classes)

    def _load_ultralytics(self, entry: ModelEntry, device: str) -> LoadedModel:
        if not YOLO_AVAILABLE:
            raise ImportError("ultralytics is required. Install: pip install ultralytics")

        model = YOLO(f"{entry.backbone}.pt")
        if device != "cpu":
            model.to(device)

        return LoadedModel(model, entry, device)

    # ---- Helpers ----

    @staticmethod
    def _replace_head(model: "nn.Module", backbone: str, num_classes: int) -> "nn.Module":
        """Replace the classification head for transfer learning."""
        import torch.nn as nn

        if backbone.startswith("resnet"):
            in_features = model.fc.in_features
            model.fc = nn.Sequential(
                nn.Dropout(0.3),
                nn.Linear(in_features, num_classes),
            )
        elif backbone.startswith("mobilenetv3"):
            in_features = model.classifier[-1].in_features
            model.classifier[-1] = nn.Linear(in_features, num_classes)
        elif backbone.startswith("densenet"):
            in_features = model.classifier.in_features
            model.classifier = nn.Linear(in_features, num_classes)
        elif backbone == "inception_v3":
            in_features = model.fc.in_features
            model.fc = nn.Linear(in_features, num_classes)

        return model

    @staticmethod
    def _get_default_transform(input_size: int):
        if not TORCHVISION_AVAILABLE:
            return None
        return T.Compose([
            T.Resize((input_size, input_size)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    @staticmethod
    def _cleanup_model(loaded_model: LoadedModel):
        """Free GPU memory for evicted models."""
        if TORCH_AVAILABLE and hasattr(loaded_model.model, "cpu"):
            try:
                loaded_model.model.cpu()
                del loaded_model.model
                torch.cuda.empty_cache()
            except Exception:
                pass
