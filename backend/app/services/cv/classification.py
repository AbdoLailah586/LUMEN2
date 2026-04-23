"""
CV Image Classification via Transfer Learning.
"""
import torch
import torch.nn as nn
from typing import Dict, Any
import torchvision.models as models

class ImageClassifier(nn.Module):
    def __init__(self, num_classes: int, backbone_name: str = "resnet50", pretrained: bool = True):
        """
        Loads a pre-trained backbone and swaps the final classification head.
        """
        super(ImageClassifier, self).__init__()
        self.num_classes = num_classes
        self.backbone_name = backbone_name
        
        self.backbone = self._get_backbone(pretrained)
        
    def _get_backbone(self, pretrained: bool):
        if self.backbone_name == "resnet18":
            model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT if pretrained else None)
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, self.num_classes)
            return model
            
        elif self.backbone_name == "resnet50":
            model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if pretrained else None)
            num_ftrs = model.fc.in_features
            model.fc = nn.Sequential(
                nn.Dropout(0.3),
                nn.Linear(num_ftrs, self.num_classes)
            )
            return model
            
        elif self.backbone_name == "efficientnet_b0":
            model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT if pretrained else None)
            num_ftrs = model.classifier[1].in_features
            model.classifier[1] = nn.Linear(num_ftrs, self.num_classes)
            return model
            
        else:
            raise ValueError(f"Unsupported backbone: {self.backbone_name}")

    def forward(self, x):
        return self.backbone(x)
        
    def freeze_backbone(self):
        """Freezes all layers except the final classification head."""
        for param in self.parameters():
            param.requires_grad = False
            
        # Unfreeze head based on architecture
        if self.backbone_name.startswith("resnet"):
            for param in self.backbone.fc.parameters():
                param.requires_grad = True
        elif self.backbone_name.startswith("efficientnet"):
            for param in self.backbone.classifier.parameters():
                param.requires_grad = True
                
    def unfreeze_all(self):
        """Unfreezes all layers for fine-tuning."""
        for param in self.parameters():
            param.requires_grad = True
