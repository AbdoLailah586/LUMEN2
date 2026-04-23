import pandas as pd
import joblib

# Auto-generated inference script for Model_beginner_classification

def load_model(model_path):
    return joblib.load(model_path)

def predict(data_path, model_path=r"uploads/models\adaa9a0e-4c06-4378-a20a-9cec3971d9c2.joblib"):
    original_df = pd.read_csv(data_path)
    df = original_df.copy()
    model = load_model(model_path)
    
    # 1. Fill NaNs
    df = df.fillna(0)
    
    # 2. Drop the target column if it exists in the test data
    if "Survived" in df.columns:
        df = df.drop(columns=["Survived"])
        
    # 3. Create dummy variables for text columns
    cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
    
    # 4. Re-align columns to match what the model was trained on
    # Any missing dummy categories in this file will be filled with 0
    if hasattr(model, 'feature_names_in_'):
        df = df.reindex(columns=model.feature_names_in_, fill_value=0)
        
    predictions = model.predict(df)
    
    # Add predictions back to the original dataset for readability
    original_df['Prediction'] = predictions
    return original_df

if __name__ == "__main__":
    results_df = predict(r"uploads/c766cbf7-7fb7-43cf-82ef-6464802d4d41_cleaned.csv")
    
    print("\n" + "="*50)
    print("🎯 PREDICTION RESULTS ")
    print("="*50)
    
    # Pick a few key columns to show alongside the prediction
    display_cols = []
    for col in ['PassengerId', 'Name', 'Sex', 'Age']:
        if col in results_df.columns:
            display_cols.append(col)
    display_cols.append('Prediction')
    
    print(results_df[display_cols].head(15).to_markdown(index=False))
    
    output_filename = "final_predictions.csv"
    results_df.to_csv(output_filename, index=False)
    print(f"\n✅ All {len(results_df)} predictions have been saved to '{output_filename}'")
