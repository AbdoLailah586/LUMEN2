import os
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, SAGEConv, global_mean_pool, global_max_pool, global_add_pool
from torch_geometric.data import DataLoader, Data
import mlflow
from typing import List, Optional

class GraphClassificationModel(torch.nn.Module):
    def __init__(self, num_features: int, hidden_dim: int, num_classes: int, 
                 layer_type: str = "GCN", pooling_type: str = "mean", num_layers: int = 2):
        super(GraphClassificationModel, self).__init__()
        
        self.pooling_type = pooling_type
        self.convs = torch.nn.ModuleList()
        
        # Select convolution layer
        conv_layer = GCNConv if layer_type == "GCN" else SAGEConv
        
        # First layer
        self.convs.append(conv_layer(num_features, hidden_dim))
        
        # Hidden layers
        for _ in range(num_layers - 1):
            self.convs.append(conv_layer(hidden_dim, hidden_dim))
            
        self.classifier = torch.nn.Linear(hidden_dim, num_classes)

    def forward(self, x, edge_index, batch):
        # Node embeddings
        for conv in self.convs:
            x = conv(x, edge_index)
            x = F.relu(x)
            
        # Graph pooling
        if self.pooling_type == "mean":
            x = global_mean_pool(x, batch)
        elif self.pooling_type == "max":
            x = global_max_pool(x, batch)
        elif self.pooling_type == "add":
            x = global_add_pool(x, batch)
        else:
            x = global_mean_pool(x, batch) # default
            
        # Classifier
        out = self.classifier(x)
        return out

class GNNAgentTrainer:
    def __init__(self, num_features: int, num_classes: int, 
                 hidden_dim: int = 64, layer_type: str = "GCN", 
                 pooling_type: str = "mean", num_layers: int = 2,
                 model_dir: str = "./models"):
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = GraphClassificationModel(
            num_features=num_features,
            hidden_dim=hidden_dim,
            num_classes=num_classes,
            layer_type=layer_type,
            pooling_type=pooling_type,
            num_layers=num_layers
        ).to(self.device)
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
    def train(self, train_data: List[Data], epochs: int = 100, lr: float = 0.01, 
              batch_size: int = 32, experiment_name: str = "GNN_Training"):
        
        loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = torch.nn.CrossEntropyLoss()
        
        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            mlflow.log_param("epochs", epochs)
            mlflow.log_param("learning_rate", lr)
            mlflow.log_param("batch_size", batch_size)
            
            best_loss = float('inf')
            
            for epoch in range(epochs):
                self.model.train()
                total_loss = 0
                correct = 0
                total_samples = 0
                
                for data in loader:
                    data = data.to(self.device)
                    optimizer.zero_grad()
                    
                    # Assuming graph classification where each graph has one label
                    # In our tabular-to-graph setup, if we treat the whole table as 1 graph,
                    # graph classification will output 1 label for the whole table.
                    # PyG creates a 'batch' vector mapping nodes to their respective graphs.
                    batch_vec = data.batch if hasattr(data, 'batch') and data.batch is not None else torch.zeros(data.x.size(0), dtype=torch.long, device=self.device)
                    
                    out = self.model(data.x, data.edge_index, batch_vec)
                    
                    # Check if y is node-level or graph-level.
                    # For graph classification, y should be [batch_size].
                    # If y is [num_nodes], and we want graph classification, we take the mode or just use the first element if it's a homogeneous graph label.
                    if data.y.size(0) == data.x.size(0):
                        # Node-level labels provided, but we are doing Graph Classification.
                        # We'll take the most frequent label in the graph.
                        y_graph = []
                        for i in range(out.size(0)):
                            mask = batch_vec == i
                            mode_val = torch.mode(data.y[mask])[0]
                            y_graph.append(mode_val)
                        y_graph = torch.stack(y_graph)
                    else:
                        y_graph = data.y
                        
                    loss = criterion(out, y_graph)
                    loss.backward()
                    optimizer.step()
                    
                    total_loss += loss.item() * out.size(0)
                    pred = out.argmax(dim=1)
                    correct += int((pred == y_graph).sum())
                    total_samples += out.size(0)
                    
                avg_loss = total_loss / total_samples
                accuracy = correct / total_samples
                
                mlflow.log_metric("train_loss", avg_loss, step=epoch)
                mlflow.log_metric("train_accuracy", accuracy, step=epoch)
                
                # Checkpointing
                if avg_loss < best_loss:
                    best_loss = avg_loss
                    checkpoint_path = os.path.join(self.model_dir, "gnn_best_model.pt")
                    torch.save(self.model.state_dict(), checkpoint_path)
                    
            mlflow.log_artifact(checkpoint_path)
            return checkpoint_path

    def predict(self, data: Data) -> torch.Tensor:
        self.model.eval()
        data = data.to(self.device)
        batch_vec = data.batch if hasattr(data, 'batch') and data.batch is not None else torch.zeros(data.x.size(0), dtype=torch.long, device=self.device)
        with torch.no_grad():
            out = self.model(data.x, data.edge_index, batch_vec)
            pred = out.argmax(dim=1)
        return pred
