"""
Semantic Segmentation engine for precise mask mapping.
Provides access to U-Net and DeepLabV3 Architectures.
"""
import torch
import torch.nn as nn
from torchvision.models.segmentation import deeplabv3_resnet50, DeepLabV3_ResNet50_Weights
from typing import Any
import numpy as np

class ImageSegmenter(nn.Module):
    def __init__(self, num_classes: int, architecture: str = "deeplabv3", pretrained: bool = True):
        super(ImageSegmenter, self).__init__()
        self.num_classes = num_classes
        self.architecture = architecture
        
        if self.architecture == "deeplabv3":
            # Load pretrained DeepLabV3
            # By default torchvision deeplab is trained on 21 classes (COCO/Pascal VOC)
            weights = DeepLabV3_ResNet50_Weights.DEFAULT if pretrained else None
            self.model = deeplabv3_resnet50(weights=weights)
            
            # Modify the classifier head for custom classes
            # The classifier contains a 0: AvgPool, 1: Conv2d, 2: BatchNorm2d, 3: ReLU, 4: Conv2d
            # We replace the final Conv2d to match num_classes
            self.model.classifier[4] = nn.Conv2d(256, self.num_classes, kernel_size=(1, 1), stride=(1, 1))
            
            # Also modify the aux classifier if present
            if self.model.aux_classifier is not None:
                self.model.aux_classifier[4] = nn.Conv2d(256, self.num_classes, kernel_size=(1, 1), stride=(1, 1))
        elif self.architecture == "unet":
            # Fallback to a custom Unet implementation if requested
            self.model = self._build_simple_unet()
        else:
             raise ValueError("Architecture must be 'deeplabv3' or 'unet'")
             
    def _build_simple_unet(self) -> nn.Module:
        """A minimal baseline U-Net architecture helper."""
        # Using a standard lightweight torchhub U-Net if custom implementation isn't strictly required
        # For production LUMEN pipeline, we rely on standard architectures.
        model = torch.hub.load('mateuszbuda/brain-segmentation-pytorch', 'unet',
            in_channels=3, out_channels=1, init_features=32, pretrained=False)
            
        if self.num_classes != 1:
            # Swap final conv layer
            model.conv = nn.Conv2d(32, self.num_classes, kernel_size=1)
        return model

    def forward(self, x):
        """Pass input through model."""
        return self.model(x)

    def segment(self, image_tensor: torch.Tensor, device: str = 'cpu') -> np.ndarray:
        """
        Runs inference and returns the highest probability class mask.
        image_tensor shape expected: (1, C, H, W)
        """
        self.eval()
        self.to(device)
        image_tensor = image_tensor.to(device)
        
        with torch.no_grad():
            output = self.model(image_tensor)
            
            # DeepLabV3 returns an OrderedDict with 'out' and 'aux'
            if isinstance(output, dict):
                output = output['out']
                
            # output shape: (1, num_classes, H, W)
            # Find the index of the max probability across classes for each pixel
            om = torch.argmax(output.squeeze(), dim=0).detach().cpu().numpy()
            
        return om
