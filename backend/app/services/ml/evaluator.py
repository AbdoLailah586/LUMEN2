from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np

class ModelEvaluator:
    def evaluate(self, model, X_test, y_test, task_type='classification'):
        preds = model.predict(X_test)
        metrics = {}
        
        if task_type == 'classification':
            metrics['accuracy'] = float(accuracy_score(y_test, preds))
            metrics['precision'] = float(precision_score(y_test, preds, average='weighted', zero_division=0))
            metrics['recall'] = float(recall_score(y_test, preds, average='weighted', zero_division=0))
            metrics['f1'] = float(f1_score(y_test, preds, average='weighted', zero_division=0))
        else:
            metrics['mse'] = float(mean_squared_error(y_test, preds))
            metrics['rmse'] = float(np.sqrt(metrics['mse']))
            metrics['mae'] = float(mean_absolute_error(y_test, preds))
            metrics['r2'] = float(r2_score(y_test, preds))
            
        return metrics
