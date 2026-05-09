import os
import json
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import pandas as pd
from typing import Dict, Any, List, Optional

from app.core.config import settings

class GeminiService:
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found in settings.")
        
        genai.configure(api_key=api_key)
        self.model_name = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")
        self.model = genai.GenerativeModel(self.model_name)
        self.temperature = settings.GEMINI_TEMPERATURE



    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _call_gemini(self, prompt: str) -> str:
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=int(os.getenv("GEMINI_MAX_TOKENS", 2048)),
                )
            )
            return response.text
        except Exception as e:
            print(f"ERROR: Gemini API call failed: {str(e)}")
            raise e


    async def analyze_columns(self, df_sample: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyzes column names and sample values to infer meaning.
        """
        column_data = []
        for col in df_sample.columns:
            column_data.append({
                "name": col,
                "samples": df_sample[col].dropna().head(5).tolist(),
                "dtype": str(df_sample[col].dtype)
            })

        prompt = f"""
        Analyze these dataset columns and infer their meaning.
        
        Column data (names and samples):
        {json.dumps(column_data, indent=2)}
        
        For each column, identify:
        1. Data type (numerical, categorical, datetime, text, id, or other)
        2. Likely meaning (e.g., 'age', 'salary', 'product_name', 'unique_id')
        3. Potential issues (outliers, formatting errors, private data)
        4. Suggested cleaning actions
        
        Format the response as a valid JSON object where keys are column names.
        Example:
        {{
            "age": {{
                "type": "numerical",
                "meaning": "Age of the customer",
                "issues": "Possible outliers > 120",
                "cleaning": "cap_at_100"
            }}
        }}
        """
        
        response_text = await self._call_gemini(prompt)
        try:
            # Clean response text from markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception as e:
            print(f"Gemini parse error: {e}\nResponse: {response_text}")
            return {{col: {{"type": "unknown"}} for col in df_sample.columns}}

    async def suggest_cleaning(self, df_stats: Dict[str, Any], column_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Suggests cleaning operations based on data statistics and column meaning.
        """
        prompt = f"""
        You are a data science expert. Based on the following column analysis and statistics, suggest specific cleaning actions.
        
        Column Analysis:
        {json.dumps(column_analysis, indent=2)}
        
        Statistics (Missing values, Outliers):
        {json.dumps(df_stats, indent=2)}
        
        Suggest actions like 'fill_missing', 'remove_outliers', 'cap_outliers', 'drop_column', 'convert_type'.
        Format the response as a JSON list of objects:
        [
            {{
                "column": "column_name",
                "action": "action_name",
                "params": {{"strategy": "median"}},
                "reason": "Explain why this is recommended"
            }}
        ]
        """
        
        response_text = await self._call_gemini(prompt)
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return []

    async def suggest_models(self, rows: int, cols: int, target: str, task_type: str, column_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recommends models and hyperparameters.
        """
        prompt = f"""
        Recommend ML models for this task.
        
        Dataset Info: {rows} rows, {cols} columns.
        Target Variable: '{target}'
        Task Type: {task_type}
        
        Column Context:
        {json.dumps(column_analysis, indent=2)}
        
        Return a JSON object:
        {{
            "task_type": "classification/regression",
            "recommended_models": [
                {{
                    "name": "ModelName",
                    "reason": "Why this model?",
                    "hyperparameters": {{"param": value}}
                }}
            ],
            "feature_engineering_tips": ["tip1", "tip2"],
            "reasoning": "Overall strategy summary"
        }}
        """
        
        response_text = await self._call_gemini(prompt)
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return {{"error": "Failed to generate model suggestions"}}

    async def chat(self, question: str, context: Dict[str, Any]) -> str:
        """
        Conversational assistant for data questions.
        """
        prompt = f"""
        You are LUMEN AI, a helpful data science assistant.
        
        Current Context (Dataset summary):
        {json.dumps(context, indent=2)}
        
        User Question: {question}
        
        Provide a concise, expert answer. Use markdown for formatting.
        """
        return await self._call_gemini(prompt)

    async def generate_cleaning_code(self, df_sample: pd.DataFrame, column_analysis: Dict[str, Any]) -> str:
        """
        Generates Python code for automated data cleaning using pandas.
        """
        prompt = f"""
        You are a senior data scientist. Generate a Python function `clean_data(df)` that performs automated cleaning on this specific dataset.
        
        Dataset Analysis:
        {json.dumps(column_analysis, indent=2)}
        
        Sample Data (first 5 rows):
        {df_sample.to_json(orient='records', indent=2)}
        
        The function must:
        1. Handle missing values (impute or drop based on column meaning).
        2. Remove duplicates.
        3. Standardize column names (snake_case).
        4. Fix data types (e.g., convert date strings to datetime).
        5. Handle outliers in numerical columns.
        6. Return the cleaned DataFrame.
        
        ONLY return the Python code block starting with `def clean_data(df):`. 
        Do not include any explanations, imports (assume pandas is pd), or example usage.
        """
        
        response_text = await self._call_gemini(prompt)
        
        # Extract code from markdown if present
        if "```python" in response_text:
            response_text = response_text.split("```python")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            
        return response_text.strip()

