import optuna
from sklearn.metrics import accuracy_score, mean_squared_error
from sklearn.model_selection import train_test_split
from .trainer import MultiBackendTrainer
import numpy as np

class HyperparameterOptimizer:
    def __init__(self, time_budget_seconds=60):
        self.time_budget = time_budget_seconds

    def optimize(self, X, y, task_type='classification', backend='scikit-learn', model_type='rf'):
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        
        def objective(trial):
            params = {}
            if model_type == 'rf':
                params['n_estimators'] = trial.suggest_int('n_estimators', 50, 200)
                params['max_depth'] = trial.suggest_int('max_depth', 3, 15)
            elif model_type == 'xgboost':
                params['n_estimators'] = trial.suggest_categorical('n_estimators', [100, 200, 300])
                params['max_depth'] = trial.suggest_categorical('max_depth', [3, 5, 7])
                params['learning_rate'] = trial.suggest_categorical('learning_rate', [0.01, 0.05, 0.1])
                params['subsample'] = trial.suggest_categorical('subsample', [0.7, 0.8, 0.9])
                params['colsample_bytree'] = trial.suggest_categorical('colsample_bytree', [0.7, 0.8, 0.9])
                
            trainer = MultiBackendTrainer(backend=backend, model_type=model_type, params=params)
            model = trainer.train(X_train, y_train, task_type)
            preds = model.predict(X_val)
            
            if task_type == 'classification':
                # Convert predictions to class labels if continuous
                if len(np.unique(preds)) > len(np.unique(y_val)):
                    preds = np.round(preds)
                return accuracy_score(y_val, preds)
            else:
                return -mean_squared_error(y_val, preds)
                
        direction = "maximize" if task_type == 'classification' else "minimize"
        # Turn off optuna logging to stdout
        optuna.logging.set_verbosity(optuna.logging.WARNING)
        study = optuna.create_study(direction=direction)
        study.optimize(objective, timeout=self.time_budget)
        return study.best_params
