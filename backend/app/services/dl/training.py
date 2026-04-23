"""
Distributed DL training loops with Checkpointing, Early Stopping, and Schedulers.
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Dict, Any, Callable
import os
import copy

class EarlyStopping:
    def __init__(self, patience: int = 7, min_delta: float = 0.0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss: float):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0

class DLTrainer:
    def __init__(self, output_dir: str = "./mlruns/checkpoints", device: str = None):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.device = device if device else ("cuda" if torch.cuda.is_available() else "cpu")

    def train(
        self, 
        model: nn.Module, 
        train_loader: DataLoader, 
        val_loader: DataLoader, 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes a robust PyTorch training loop.
        """
        model = model.to(self.device)
        
        epochs = config.get("epochs", 50)
        lr = config.get("learning_rate", 1e-3)
        weight_decay = config.get("weight_decay", 1e-5)
        patience = config.get("early_stopping_patience", 5)
        is_classification = config.get("is_classification", True)
        
        criterion = nn.CrossEntropyLoss() if is_classification else nn.MSELoss()
        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)
        early_stopping = EarlyStopping(patience=patience)
        
        best_model_wts = copy.deepcopy(model.state_dict())
        best_loss = float('inf')
        
        history = {'train_loss': [], 'val_loss': []}
        
        for epoch in range(epochs):
            # --- TRAIN ---
            model.train()
            train_loss = 0.0
            for batch_x, batch_y in train_loader:
                batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                
                optimizer.zero_grad()
                outputs = model(batch_x)
                
                if not is_classification:
                    outputs = outputs.squeeze()
                    
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item() * batch_x.size(0)
                
            train_loss /= len(train_loader.dataset)
            
            # --- VALIDATE ---
            model.eval()
            val_loss = 0.0
            with torch.no_grad():
                for batch_x, batch_y in val_loader:
                    batch_x, batch_y = batch_x.to(self.device), batch_y.to(self.device)
                    outputs = model(batch_x)
                    
                    if not is_classification:
                        outputs = outputs.squeeze()
                        
                    loss = criterion(outputs, batch_y)
                    val_loss += loss.item() * batch_x.size(0)
                    
            val_loss /= len(val_loader.dataset)
            
            history['train_loss'].append(train_loss)
            history['val_loss'].append(val_loss)
            
            scheduler.step(val_loss)
            
            # Checkpoint logic
            if val_loss < best_loss:
                best_loss = val_loss
                best_model_wts = copy.deepcopy(model.state_dict())
                torch.save(best_model_wts, os.path.join(self.output_dir, "best_model.pth"))
                
            early_stopping(val_loss)
            if early_stopping.early_stop:
                print(f"Early stopping triggered at epoch {epoch+1}")
                break
                
        # Load best model weights
        model.load_state_dict(best_model_wts)
        
        return {
            "model_path": os.path.join(self.output_dir, "best_model.pth"),
            "epochs_trained": epoch + 1,
            "best_val_loss": best_loss,
            "history": history
        }
