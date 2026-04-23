"""
Image preprocessing: Resize, normalize, augment based on target model expectations.
"""
import numpy as np
import os
from typing import Tuple, Dict, Any
from PIL import Image

try:
    import cv2
    import albumentations as A
    from albumentations.pytorch import ToTensorV2
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False

class ImageProcessor:
    def __init__(self, target_size: Tuple[int, int] = (224, 224), enable_augmentation: bool = False):
        self.target_size = target_size
        self.enable_augmentation = enable_augmentation
        
        if not CV_AVAILABLE:
            raise ImportError("Please install opencv-python and albumentations to use ImageProcessor.")
            
        self.base_transform = A.Compose([
            A.Resize(height=target_size[0], width=target_size[1]),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2()
        ])
        
        self.aug_transform = A.Compose([
            A.RandomResizedCrop(height=target_size[0], width=target_size[1], scale=(0.8, 1.0)),
            A.HorizontalFlip(p=0.5),
            A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.5),
            A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
            ToTensorV2()
        ])

    def process_from_path(self, image_path: str, is_train: bool = False) -> Any:
        """Loads and processes image from disk."""
        if not os.path.exists(image_path):
             raise FileNotFoundError(f"Image not found: {image_path}")
             
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        return self.process_array(image, is_train)
        
    def process_array(self, image_arr: np.ndarray, is_train: bool = False) -> Any:
        """Processes an existing numpy array image."""
        if is_train and self.enable_augmentation:
            augmented = self.aug_transform(image=image_arr)
        else:
            augmented = self.base_transform(image=image_arr)
            
        # Returns a PyTorch tensor (C, H, W)
        return augmented['image']
