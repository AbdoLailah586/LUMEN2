"""
YOLOv8 framework logic for bounding box Object Detection in LUMEN.
"""
import os
from typing import Dict, Any, List

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

class ObjectDetector:
    def __init__(self, model_size: str = "n", weights_path: str = None):
        """
        Initializes the YOLO object detection model.
        model_size: 'n', 's', 'm', 'l', 'x' (nano, small, medium, large, xlarge)
        """
        if not YOLO_AVAILABLE:
            raise ImportError("Please install `ultralytics` to use Object Detection.")
            
        if weights_path and os.path.exists(weights_path):
            self.model = YOLO(weights_path)
        else:
            # Download base pretrained model dynamically
            self.model = YOLO(f"yolov8{model_size}.pt")

    def train_custom(self, data_yaml_path: str, epochs: int = 50, batch_size: int = 16, img_size: int = 640):
        """
        Commences a training loop for YOLO on user's dataset.
        data_yaml_path must be properly structured.
        """
        if not os.path.exists(data_yaml_path):
            raise FileNotFoundError(f"Data config not found: {data_yaml_path}")
            
        results = self.model.train(
            data=data_yaml_path,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            patience=10,      # Early stopping parameter built-in
            save=True,        # Save best.pt automatically
            project="mlruns/yolo",
            name="custom_train"
        )
        return results

    def detect(self, image_path_or_array: Any, conf_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """
        Runs inference and formats the bounding box outputs nicely.
        """
        results = self.model.predict(
            source=image_path_or_array, 
            conf=conf_threshold,
            save=False
        )
        
        detections = []
        # Ultralytics results is a list per image
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Format: [x1, y1, x2, y2]
                coords = box.xyxy[0].tolist()
                conf = box.conf[0].item()
                cls_id = int(box.cls[0].item())
                cls_name = self.model.names[cls_id]
                
                detections.append({
                    "class": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": [round(c, 2) for c in coords]
                })
                
        return detections
