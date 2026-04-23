class CodeExporter:
    @staticmethod
    def export_pipeline(model_db) -> str:
        # Generate Python code based on the db_model record
        code = f"""import pandas as pd
import joblib

# Auto-generated inference script for {model_db.model_name}

def load_model(model_path):
    return joblib.load(model_path)

def predict(data_path, model_path=r"{model_db.storage_path}"):
    df = pd.read_csv(data_path)
    model = load_model(model_path)
    predictions = model.predict(df)
    return predictions

if __name__ == "__main__":
    preds = predict("path/to/your/new_data.csv")
    print(preds)
"""
        return code
