import pandas as pd
import joblib

# Auto-generated inference script for Model_beginner_classification

def load_model(model_path):
    return joblib.load(model_path)

def predict(data_path, model_path="uploads/models\adaa9a0e-4c06-4378-a20a-9cec3971d9c2.joblib"):
    df = pd.read_csv(data_path)
    model = load_model(model_path)
    predictions = model.predict(df)
    return predictions

if __name__ == "__main__":
    preds = predict("D:/doc/python/LUMEN/Deploy Script (PY)/new_data.csv")
    print(preds)
