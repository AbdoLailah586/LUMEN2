"""
Text classification and embedding generation using HuggingFace Transformers.
"""
import torch
import numpy as np
from typing import List, Dict, Any, Union
import logging

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModel
    from transformers import pipeline
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    logging.warning("transformers library is not installed. Text_DL module will fail if called.")

class TextDeepLearning:
    def __init__(self, model_name: str = "distilbert-base-uncased", device: str = None):
        """
        Initializes HuggingFace components for text data.
        """
        if not HF_AVAILABLE:
            raise ImportError("Please install `transformers` and `torch` to use TextDeepLearning.")
            
        self.model_name = model_name
        self.device = device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        
        # Lazy loading
        self._tokenizer = None
        self._base_model = None
        self._clf_model = None

    @property
    def tokenizer(self):
        if self._tokenizer is None:
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        return self._tokenizer
        
    @property
    def base_model(self):
        if self._base_model is None:
            self._base_model = AutoModel.from_pretrained(self.model_name).to(self.device)
            self._base_model.eval()
        return self._base_model

    def generate_embeddings(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Calculates fixed-length vector representations for a list of text strings.
        Applies batching to avoid OOM errors.
        """
        all_embeddings = []
        
        with torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i+batch_size]
                # Tokenize
                encoded = self.tokenizer(
                    batch_texts, 
                    padding=True, 
                    truncation=True, 
                    max_length=512, 
                    return_tensors="pt"
                ).to(self.device)
                
                # Get hidden states
                outputs = self.base_model(**encoded)
                
                # Mean Pooling using attention mask
                attention_mask = encoded['attention_mask'].unsqueeze(-1).expand(outputs.last_hidden_state.size()).float()
                sum_embeddings = torch.sum(outputs.last_hidden_state * attention_mask, 1)
                sum_mask = torch.clamp(attention_mask.sum(1), min=1e-9)
                mean_pooled = sum_embeddings / sum_mask
                
                all_embeddings.append(mean_pooled.cpu().numpy())
                
        return np.vstack(all_embeddings)

    def train_classifier(self, texts: List[str], labels: List[int], num_labels: int, epochs: int = 3):
        """
        Fine-tunes the transformer for a specific sequence classification task.
        In a full production scenario, this hands off to the `training.py` orchestrator.
        """
        self._clf_model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, 
            num_labels=num_labels
        ).to(self.device)
        
        # TODO: Integrate with PyTorch DataLoader and training loop inside training.py
        # This provides the model initialization hook
        return self._clf_model

    def analyze_sentiment(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Quick out-of-the-box zero-shot sentiment analysis.
        """
        sentiment_pipeline = pipeline(
            "sentiment-analysis", 
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=0 if self.device == "cuda" else -1
        )
        return sentiment_pipeline(texts)
