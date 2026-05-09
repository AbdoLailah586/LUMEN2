"""
LUMEN CV Model Registry — Centralized catalog of 20+ pre-trained vision models.
Stores metadata (accuracy, speed, size, license) and provides filtering/recommendation.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass
class ModelEntry:
    """Metadata for a single pre-trained CV model."""
    slug: str
    name: str
    task_type: str          # "classification" | "detection" | "segmentation"
    backbone: str           # e.g. "resnet50", "efficientnet_b0"
    input_size: int         # e.g. 224, 640
    accuracy: float         # Top-1 on ImageNet or mAP on COCO (0-100)
    speed_fps: float        # Approximate FPS on a mid-range GPU
    model_size_mb: float    # Weights file size in MB
    license: str            # "Apache-2.0", "MIT", "GPL-3.0", etc.
    source: str             # "torchvision" | "timm" | "ultralytics" | "transformers"
    description: str = ""
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Full Model Catalog — Classification
# ---------------------------------------------------------------------------

_CLASSIFICATION_MODELS: List[ModelEntry] = [
    ModelEntry(
        slug="resnet50",
        name="ResNet-50",
        task_type="classification",
        backbone="resnet50",
        input_size=224,
        accuracy=76.1,
        speed_fps=950,
        model_size_mb=97.8,
        license="BSD-3-Clause",
        source="torchvision",
        description="Deep residual network with 50 layers. Strong baseline for most classification tasks.",
        tags=["balanced", "popular", "transfer-learning"],
    ),
    ModelEntry(
        slug="resnet101",
        name="ResNet-101",
        task_type="classification",
        backbone="resnet101",
        input_size=224,
        accuracy=77.4,
        speed_fps=580,
        model_size_mb=170.5,
        license="BSD-3-Clause",
        source="torchvision",
        description="Deeper variant of ResNet. Better accuracy at the cost of speed.",
        tags=["accurate", "deep"],
    ),
    ModelEntry(
        slug="resnet152",
        name="ResNet-152",
        task_type="classification",
        backbone="resnet152",
        input_size=224,
        accuracy=78.3,
        speed_fps=380,
        model_size_mb=230.4,
        license="BSD-3-Clause",
        source="torchvision",
        description="Deepest ResNet variant. Highest accuracy in the ResNet family.",
        tags=["accurate", "deep", "heavy"],
    ),
    ModelEntry(
        slug="efficientnet_b0",
        name="EfficientNet-B0",
        task_type="classification",
        backbone="efficientnet_b0",
        input_size=224,
        accuracy=77.1,
        speed_fps=1200,
        model_size_mb=20.5,
        license="Apache-2.0",
        source="timm",
        description="Compact and efficient. Excellent accuracy-to-compute ratio.",
        tags=["lightweight", "efficient", "fast"],
    ),
    ModelEntry(
        slug="efficientnet_b2",
        name="EfficientNet-B2",
        task_type="classification",
        backbone="efficientnet_b2",
        input_size=260,
        accuracy=80.1,
        speed_fps=850,
        model_size_mb=35.2,
        license="Apache-2.0",
        source="timm",
        description="Medium EfficientNet variant. Good balance of accuracy and speed.",
        tags=["balanced", "efficient"],
    ),
    ModelEntry(
        slug="efficientnet_b4",
        name="EfficientNet-B4",
        task_type="classification",
        backbone="efficientnet_b4",
        input_size=380,
        accuracy=82.9,
        speed_fps=420,
        model_size_mb=74.5,
        license="Apache-2.0",
        source="timm",
        description="Larger EfficientNet. High accuracy for demanding classification tasks.",
        tags=["accurate", "efficient"],
    ),
    ModelEntry(
        slug="mobilenetv3_small",
        name="MobileNetV3 Small",
        task_type="classification",
        backbone="mobilenetv3_small",
        input_size=224,
        accuracy=67.7,
        speed_fps=2800,
        model_size_mb=6.9,
        license="BSD-3-Clause",
        source="torchvision",
        description="Ultra-lightweight model for mobile/edge deployment. Fastest inference.",
        tags=["lightweight", "mobile", "edge", "fast"],
    ),
    ModelEntry(
        slug="mobilenetv3_large",
        name="MobileNetV3 Large",
        task_type="classification",
        backbone="mobilenetv3_large",
        input_size=224,
        accuracy=74.0,
        speed_fps=2200,
        model_size_mb=16.2,
        license="BSD-3-Clause",
        source="torchvision",
        description="Larger MobileNet variant. Good trade-off for edge devices needing accuracy.",
        tags=["lightweight", "mobile", "balanced"],
    ),
    ModelEntry(
        slug="vit_base",
        name="Vision Transformer (ViT-B/16)",
        task_type="classification",
        backbone="vit_base_patch16_224",
        input_size=224,
        accuracy=81.8,
        speed_fps=310,
        model_size_mb=330.0,
        license="Apache-2.0",
        source="timm",
        description="Transformer-based architecture. State-of-the-art with sufficient data.",
        tags=["transformer", "accurate", "heavy", "sota"],
    ),
    ModelEntry(
        slug="densenet121",
        name="DenseNet-121",
        task_type="classification",
        backbone="densenet121",
        input_size=224,
        accuracy=74.4,
        speed_fps=820,
        model_size_mb=30.8,
        license="BSD-3-Clause",
        source="torchvision",
        description="Dense connectivity pattern. Parameter-efficient with feature reuse.",
        tags=["efficient", "compact", "medical"],
    ),
    ModelEntry(
        slug="densenet169",
        name="DenseNet-169",
        task_type="classification",
        backbone="densenet169",
        input_size=224,
        accuracy=75.6,
        speed_fps=650,
        model_size_mb=54.7,
        license="BSD-3-Clause",
        source="torchvision",
        description="Deeper DenseNet variant with improved feature propagation.",
        tags=["accurate", "compact"],
    ),
    ModelEntry(
        slug="inception_v3",
        name="Inception V3",
        task_type="classification",
        backbone="inception_v3",
        input_size=299,
        accuracy=77.3,
        speed_fps=700,
        model_size_mb=103.9,
        license="Apache-2.0",
        source="torchvision",
        description="Multi-scale feature extraction with factorized convolutions.",
        tags=["multi-scale", "popular"],
    ),
]

# ---------------------------------------------------------------------------
# Full Model Catalog — Detection
# ---------------------------------------------------------------------------

_DETECTION_MODELS: List[ModelEntry] = [
    ModelEntry(
        slug="yolov8n",
        name="YOLOv8 Nano",
        task_type="detection",
        backbone="yolov8n",
        input_size=640,
        accuracy=37.3,  # mAP50-95 on COCO
        speed_fps=3200,
        model_size_mb=6.2,
        license="AGPL-3.0",
        source="ultralytics",
        description="Ultra-fast nano detector. Ideal for real-time edge deployment.",
        tags=["fast", "edge", "real-time", "lightweight"],
    ),
    ModelEntry(
        slug="yolov8s",
        name="YOLOv8 Small",
        task_type="detection",
        backbone="yolov8s",
        input_size=640,
        accuracy=44.9,
        speed_fps=1800,
        model_size_mb=22.5,
        license="AGPL-3.0",
        source="ultralytics",
        description="Small YOLO variant. Good balance of speed and accuracy for detection.",
        tags=["balanced", "real-time"],
    ),
    ModelEntry(
        slug="yolov8m",
        name="YOLOv8 Medium",
        task_type="detection",
        backbone="yolov8m",
        input_size=640,
        accuracy=50.2,
        speed_fps=1000,
        model_size_mb=52.0,
        license="AGPL-3.0",
        source="ultralytics",
        description="Medium YOLO. Higher accuracy for production detection pipelines.",
        tags=["accurate", "production"],
    ),
    ModelEntry(
        slug="fasterrcnn_resnet50",
        name="Faster R-CNN (ResNet-50)",
        task_type="detection",
        backbone="fasterrcnn_resnet50_fpn",
        input_size=800,
        accuracy=37.0,
        speed_fps=150,
        model_size_mb=160.0,
        license="BSD-3-Clause",
        source="torchvision",
        description="Two-stage detector with Feature Pyramid Network. High-quality detections.",
        tags=["accurate", "two-stage", "research"],
    ),
]

# ---------------------------------------------------------------------------
# Full Model Catalog — Segmentation
# ---------------------------------------------------------------------------

_SEGMENTATION_MODELS: List[ModelEntry] = [
    ModelEntry(
        slug="deeplabv3_resnet50",
        name="DeepLabV3+ (ResNet-50)",
        task_type="segmentation",
        backbone="deeplabv3_resnet50",
        input_size=520,
        accuracy=66.4,  # mIoU on Pascal VOC
        speed_fps=95,
        model_size_mb=160.5,
        license="BSD-3-Clause",
        source="torchvision",
        description="Atrous convolution-based segmentation. Strong general-purpose segmenter.",
        tags=["accurate", "popular", "semantic"],
    ),
    ModelEntry(
        slug="deeplabv3_mobilenet",
        name="DeepLabV3+ (MobileNet)",
        task_type="segmentation",
        backbone="deeplabv3_mobilenet_v3_large",
        input_size=520,
        accuracy=60.3,
        speed_fps=280,
        model_size_mb=44.3,
        license="BSD-3-Clause",
        source="torchvision",
        description="Lightweight segmentation model. Suitable for mobile and edge devices.",
        tags=["lightweight", "mobile", "fast"],
    ),
    ModelEntry(
        slug="maskrcnn_resnet50",
        name="Mask R-CNN (ResNet-50 FPN)",
        task_type="segmentation",
        backbone="maskrcnn_resnet50_fpn",
        input_size=800,
        accuracy=37.9,  # mask AP on COCO
        speed_fps=80,
        model_size_mb=170.0,
        license="BSD-3-Clause",
        source="torchvision",
        description="Instance segmentation with per-object masks. Extends Faster R-CNN.",
        tags=["instance", "accurate", "research"],
    ),
    ModelEntry(
        slug="unet_resnet34",
        name="U-Net (ResNet-34 Encoder)",
        task_type="segmentation",
        backbone="unet_resnet34",
        input_size=256,
        accuracy=62.0,
        speed_fps=200,
        model_size_mb=89.0,
        license="MIT",
        source="torchvision",
        description="Encoder-decoder architecture. Popular in medical imaging and fine-grained segmentation.",
        tags=["medical", "encoder-decoder", "popular"],
    ),
]


# ---------------------------------------------------------------------------
# Combined catalog
# ---------------------------------------------------------------------------

MODEL_CATALOG: Dict[str, ModelEntry] = {}
for _model in _CLASSIFICATION_MODELS + _DETECTION_MODELS + _SEGMENTATION_MODELS:
    MODEL_CATALOG[_model.slug] = _model


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_models(
    task_type: Optional[str] = None,
    max_size_mb: Optional[float] = None,
    source: Optional[str] = None,
    sort_by: str = "accuracy",
    descending: bool = True,
) -> List[Dict[str, Any]]:
    """Return filtered and sorted list of model metadata dicts."""
    results = list(MODEL_CATALOG.values())

    if task_type:
        results = [m for m in results if m.task_type == task_type]
    if max_size_mb is not None:
        results = [m for m in results if m.model_size_mb <= max_size_mb]
    if source:
        results = [m for m in results if m.source == source]

    reverse = descending
    if sort_by == "accuracy":
        results.sort(key=lambda m: m.accuracy, reverse=reverse)
    elif sort_by == "speed":
        results.sort(key=lambda m: m.speed_fps, reverse=reverse)
    elif sort_by == "size":
        results.sort(key=lambda m: m.model_size_mb, reverse=not reverse)
    elif sort_by == "name":
        results.sort(key=lambda m: m.name, reverse=False)

    return [m.to_dict() for m in results]


def get_model_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    """Return a single model's metadata dict, or None if not found."""
    entry = MODEL_CATALOG.get(slug)
    return entry.to_dict() if entry else None


def recommend_model(
    num_images: int = 100,
    num_classes: int = 10,
    needs_speed: bool = False,
    task_type: str = "classification",
) -> List[Dict[str, Any]]:
    """
    AI-driven model recommendation based on dataset characteristics.
    Returns a ranked list of models with reasoning.
    """
    candidates = [m for m in MODEL_CATALOG.values() if m.task_type == task_type]
    recommendations = []

    for model in candidates:
        score = 0.0
        reasons = []

        # --- Classification heuristics ---
        if task_type == "classification":
            if num_images < 100:
                # Small dataset → prefer lightweight to avoid overfitting
                if model.model_size_mb < 30:
                    score += 30
                    reasons.append("Lightweight model prevents overfitting on small datasets")
                elif model.model_size_mb > 200:
                    score -= 20
                    reasons.append("Large model may overfit with limited data")

            if num_images >= 1000:
                # Larger dataset → bigger models can shine
                score += model.accuracy * 0.5
                reasons.append(f"High accuracy ({model.accuracy}%) benefits from sufficient data")

            if num_classes < 10:
                if model.model_size_mb < 100:
                    score += 15
                    reasons.append("Few classes don't require very deep architectures")
            elif num_classes > 100:
                if "transformer" in model.tags or model.accuracy > 80:
                    score += 25
                    reasons.append("Complex task benefits from high-capacity models")

            if needs_speed:
                score += (model.speed_fps / 100)
                reasons.append(f"Fast inference at {model.speed_fps} FPS")
            else:
                score += model.accuracy * 0.8

        # --- Detection heuristics ---
        elif task_type == "detection":
            if needs_speed:
                score += (model.speed_fps / 50)
                reasons.append(f"Real-time capability at {model.speed_fps} FPS")
            else:
                score += model.accuracy * 1.5
                reasons.append(f"Detection mAP of {model.accuracy}%")

            if num_images < 500 and "ultralytics" in model.source:
                score += 20
                reasons.append("YOLO models include strong data augmentation and work well with limited data")

        # --- Segmentation heuristics ---
        elif task_type == "segmentation":
            if needs_speed:
                if "mobile" in model.backbone or "lightweight" in model.tags:
                    score += 30
                    reasons.append("Mobile backbone enables real-time segmentation")
            else:
                score += model.accuracy * 1.2

            if "medical" in model.tags and num_classes <= 5:
                score += 15
                reasons.append("Well-suited for medical/fine-grained segmentation tasks")

        recommendations.append({
            **model.to_dict(),
            "score": round(score, 1),
            "reasons": reasons[:3],  # Top 3 reasons
        })

    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations
