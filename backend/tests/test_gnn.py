import pytest
import pandas as pd
import numpy as np
import torch
from app.services.gnn.graph_utils import tabular_to_graph
from app.services.gnn.gnn_agent import GraphClassificationModel

def test_tabular_to_graph():
    # Create dummy data
    df = pd.DataFrame(np.random.rand(20, 5), columns=[f"col_{i}" for i in range(5)])
    df['target'] = np.random.randint(0, 2, 20)
    
    # Test k-NN construction
    data = tabular_to_graph(df, target_col='target', similarity_metric='cosine', construction_method='knn', k=3)
    
    assert data.x.size(0) == 20
    assert data.x.size(1) == 5
    assert data.y.size(0) == 20
    # For k=3, each node has 3 edges (directed), so 20 * 3 = 60 edges
    assert data.edge_index.size(1) == 60
    assert data.edge_attr.size(0) == 60

def test_gnn_model_forward():
    model = GraphClassificationModel(num_features=5, hidden_dim=16, num_classes=2, layer_type="GCN", pooling_type="mean")
    
    x = torch.rand((10, 5))
    edge_index = torch.tensor([[0, 1, 2, 3], [1, 2, 3, 0]], dtype=torch.long)
    batch = torch.zeros(10, dtype=torch.long) # All nodes in one graph
    
    out = model(x, edge_index, batch)
    
    assert out.size(0) == 1 # One graph
    assert out.size(1) == 2 # Two classes
