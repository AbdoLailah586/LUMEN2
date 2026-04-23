"""
PyTorch Neural Network architecture for Tabular data.
Provides automatic dimension scaling and configurable architectures.
"""
import torch
import torch.nn as nn
from typing import Dict, Any, List

class TabularDeepLearning(nn.Module):
    def __init__(self, input_dim: int, output_dim: int, config: Dict[str, Any] = None):
        """
        Dynamically constructs a PyTorch Neural Network based on input dimensions.
        
        config example:
        {
            "hidden_layers": [256, 128, 64],
            "activation": "relu", # relu, leaky_relu, gelu
            "dropout_rate": 0.3,
            "use_batch_norm": True
        }
        """
        super(TabularDeepLearning, self).__init__()
        
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.config = config or self._default_config()
        
        self.network = self._build_network()
        
    def _default_config(self) -> Dict[str, Any]:
        """Auto-configure layers if not explicitly provided."""
        # Heuristic: input -> input*2 -> input -> max(input/2, 64) -> output
        l1 = max(64, self.input_dim * 2)
        l2 = max(32, self.input_dim)
        l3 = max(16, self.input_dim // 2)
        
        return {
            "hidden_layers": [l1, l2, l3],
            "activation": "relu",
            "dropout_rate": 0.2,
            "use_batch_norm": True
        }
        
    def _get_activation(self):
        act = self.config.get("activation", "relu").lower()
        if act == "leaky_relu":
            return nn.LeakyReLU()
        elif act == "gelu":
            return nn.GELU()
        return nn.ReLU()
        
    def _build_network(self) -> nn.Sequential:
        layers = []
        in_features = self.input_dim
        
        hidden_sizes = self.config.get("hidden_layers", [128, 64])
        use_bn = self.config.get("use_batch_norm", True)
        dropout_p = self.config.get("dropout_rate", 0.0)
        
        for out_features in hidden_sizes:
            layers.append(nn.Linear(in_features, out_features))
            
            if use_bn:
                layers.append(nn.BatchNorm1d(out_features))
                
            layers.append(self._get_activation())
            
            if dropout_p > 0:
                layers.append(nn.Dropout(p=dropout_p))
                
            in_features = out_features
            
        # Final output layer
        layers.append(nn.Linear(in_features, self.output_dim))
        
        return nn.Sequential(*layers)
        
    def forward(self, x):
        return self.network(x)

    def get_parameter_count(self) -> int:
        """Returns the total number of trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)

