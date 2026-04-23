import os
import numpy as np
import pandas as pd
import torch
import networkx as nx
import matplotlib.pyplot as plt
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from torch_geometric.data import Data
import io
import base64

def tabular_to_graph(df: pd.DataFrame, target_col: str, 
                     similarity_metric: str = "cosine", 
                     construction_method: str = "knn", 
                     k: int = 5, threshold: float = 0.5) -> Data:
    """
    Converts a tabular dataset to a PyTorch Geometric Data object.
    Rows become nodes, features become node features.
    Edges are constructed based on similarity between rows.
    """
    X_df = df.drop(columns=[target_col]).select_dtypes(include=[np.number]).fillna(0)
    y_series = df[target_col]
    
    X = X_df.values
    y = y_series.values
    
    # Calculate similarity matrix
    if similarity_metric == "cosine":
        sim_matrix = cosine_similarity(X)
    elif similarity_metric == "euclidean":
        # Invert euclidean distance to get similarity
        dists = euclidean_distances(X)
        sim_matrix = 1 / (1 + dists)
    elif similarity_metric == "correlation":
        sim_matrix = np.corrcoef(X)
    else:
        raise ValueError(f"Unknown similarity metric: {similarity_metric}")
        
    num_nodes = X.shape[0]
    edge_index_list = []
    edge_attr_list = []
    
    if construction_method == "knn":
        for i in range(num_nodes):
            # argsort sorts ascending, so we take the last k elements (excluding the node itself which is at the end)
            # Actually, to be safe, get distances
            sims = sim_matrix[i]
            # Set self-similarity to -inf to ignore
            sims[i] = -np.inf
            # Get top k indices
            top_k_idx = np.argsort(sims)[-k:]
            for j in top_k_idx:
                edge_index_list.append([i, j])
                edge_attr_list.append([sim_matrix[i, j]])
                
    elif construction_method == "threshold":
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j and sim_matrix[i, j] >= threshold:
                    edge_index_list.append([i, j])
                    edge_attr_list.append([sim_matrix[i, j]])
    else:
        raise ValueError(f"Unknown construction method: {construction_method}")
        
    if not edge_index_list:
        # Fallback to fully connected if no edges found
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j:
                    edge_index_list.append([i, j])
                    edge_attr_list.append([0.0])
                    
    edge_index = torch.tensor(edge_index_list, dtype=torch.long).t().contiguous()
    edge_attr = torch.tensor(edge_attr_list, dtype=torch.float)
    x = torch.tensor(X, dtype=torch.float)
    y_tensor = torch.tensor(y, dtype=torch.long)
    
    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, y=y_tensor)

def visualize_graph(data: Data, max_nodes: int = 100, save_path: str = None) -> str:
    """
    Creates a NetworkX visualization of the graph and saves it or returns a base64 string.
    Subsamples nodes if the graph is too large.
    """
    G = nx.Graph()
    
    num_nodes = min(data.num_nodes, max_nodes)
    
    # Add nodes
    labels = data.y.numpy()
    for i in range(num_nodes):
        G.add_node(i, label=int(labels[i]))
        
    # Add edges
    edge_index = data.edge_index.numpy()
    for idx in range(edge_index.shape[1]):
        u, v = edge_index[0, idx], edge_index[1, idx]
        if u < num_nodes and v < num_nodes:
            G.add_edge(u, v)
            
    plt.figure(figsize=(10, 8))
    
    # Get colors based on labels
    unique_labels = np.unique(labels[:num_nodes])
    colors = [plt.cm.tab10(l % 10) for l in labels[:num_nodes]]
    
    pos = nx.spring_layout(G)
    nx.draw(G, pos, node_color=colors, with_labels=False, node_size=50, alpha=0.8, edge_color='#CCCCCC')
    
    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        plt.savefig(save_path, format='png', bbox_inches='tight')
        plt.close()
        return save_path
    else:
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        return img_b64
