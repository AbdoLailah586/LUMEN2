from app.core.celery_app import celery_app
import pandas as pd
import numpy as np
import os
from .graph_utils import tabular_to_graph, visualize_graph
from .gnn_agent import GNNAgentTrainer
from sklearn.model_selection import train_test_split

@celery_app.task(bind=True, name="app.services.gnn.tasks.train_gnn_agent")
def train_gnn_agent(self, data_path: str, target_column: str, 
                    similarity_metric: str = "cosine",
                    construction_method: str = "knn",
                    k: int = 5, threshold: float = 0.5,
                    epochs: int = 50, batch_size: int = 16):
    """
    Celery task to train the GNN Agent using a Tabular dataset.
    Since we are doing Graph Classification, we split the tabular data into smaller chunks 
    to create multiple graphs.
    """
    try:
        self.update_state(state="PROGRESS", meta={"status": "Loading data"})
        df = pd.read_csv(data_path)
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found.")
            
        self.update_state(state="PROGRESS", meta={"status": "Converting Tabular to Graphs"})
        
        # To train a graph classification model from a single tabular dataset,
        # we split the dataset into multiple small chunks, where each chunk becomes a separate graph.
        chunk_size = max(10, len(df) // 100) # Aim for 100 graphs, min 10 nodes per graph
        graphs = []
        
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i:i+chunk_size]
            if len(chunk) < 2:
                continue
            
            graph_data = tabular_to_graph(
                chunk, target_column, 
                similarity_metric=similarity_metric, 
                construction_method=construction_method,
                k=k, threshold=threshold
            )
            graphs.append(graph_data)
            
        if not graphs:
            raise ValueError("Failed to create any graphs from the dataset.")

        # Save visualization of the first graph
        vis_path = f"./mlruns/gnn_models/{self.request.id}/sample_graph.png"
        visualize_graph(graphs[0], save_path=vis_path)

        self.update_state(state="PROGRESS", meta={"status": "Training GNN Model"})
        
        num_features = graphs[0].x.size(1)
        # Determine number of classes
        unique_classes = set()
        for g in graphs:
            unique_classes.update(g.y.numpy().tolist())
        num_classes = len(unique_classes)
        
        trainer = GNNAgentTrainer(
            num_features=num_features, 
            num_classes=num_classes,
            model_dir=f"./mlruns/gnn_models/{self.request.id}"
        )
        
        model_path = trainer.train(
            train_data=graphs,
            epochs=epochs,
            batch_size=batch_size,
            experiment_name=f"GNN_Tabular2Graph_{self.request.id}"
        )
        
        return {
            "status": "COMPLETED",
            "model_path": model_path,
            "visualization_path": vis_path,
            "num_graphs_trained": len(graphs)
        }
    except Exception as e:
        self.update_state(state="FAILED", meta={"error": str(e)})
        raise e
