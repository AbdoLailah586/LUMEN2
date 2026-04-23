import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, VotingClassifier, VotingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.preprocessing import LabelEncoder

class SafeTreeWrapper(BaseEstimator, ClassifierMixin):
    _estimator_type = "classifier"
    
    def __init__(self, base_estimator_class=None, params=None):
        self.base_estimator_class = base_estimator_class
        self.params = params if params is not None else {}
        self.model = None
        self.le = None

    def __sklearn_tags__(self):
        tags = super().__sklearn_tags__()
        tags.estimator_type = "classifier"
        return tags

    def fit(self, X, y):
        self.le = LabelEncoder()
        y_encoded = self.le.fit_transform(y)
        self.model = self.base_estimator_class(**self.params)
        self.model.fit(X, y_encoded)
        self.classes_ = self.le.classes_
        return self

    def predict(self, X):
        preds = self.model.predict(X)
        return self.le.inverse_transform(preds)

    def predict_proba(self, X):
        return self.model.predict_proba(X)


class MultiBackendTrainer:
    def __init__(self, backend='scikit-learn', model_type='rf', params=None):
        self.backend = backend
        self.model_type = model_type
        self.params = params or {}
        self.model = None

    def get_model_instance(self, task_type):
        if self.backend == 'scikit-learn':
            if self.model_type == 'rf':
                return RandomForestClassifier(**self.params) if task_type == 'classification' else RandomForestRegressor(**self.params)
            elif self.model_type == 'linear':
                return LogisticRegression(**self.params, max_iter=1000) if task_type == 'classification' else LinearRegression(**self.params)
        elif self.backend == 'xgboost':
            return SafeTreeWrapper(XGBClassifier, params=self.params) if task_type == 'classification' else XGBRegressor(**self.params)
        elif self.backend == 'ensemble':
            if task_type == 'classification':
                xgb = SafeTreeWrapper(XGBClassifier, params=self.params)
                rf = RandomForestClassifier()
                lgbm = SafeTreeWrapper(LGBMClassifier, params={'verbose': -1})
                lr = LogisticRegression(max_iter=1000)
                return VotingClassifier(estimators=[('xgb', xgb), ('rf', rf), ('lgbm', lgbm), ('lr', lr)], voting='soft')
            else:
                xgb = XGBRegressor(**self.params)
                rf = RandomForestRegressor()
                lgbm = LGBMRegressor(verbose=-1)
                lr = LinearRegression()
                return VotingRegressor(estimators=[('xgb', xgb), ('rf', rf), ('lgbm', lgbm), ('lr', lr)])
        
        # Default fallback
        return RandomForestClassifier(**self.params) if task_type == 'classification' else RandomForestRegressor(**self.params)

    def train(self, X, y, task_type='classification'):
        self.model = self.get_model_instance(task_type)
        self.model.fit(X, y)
        return self.model
