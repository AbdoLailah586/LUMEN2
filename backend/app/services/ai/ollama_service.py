import json
from typing import Dict, Any, List

import aiohttp
import pandas as pd

from app.core.config import settings


class OllamaService:
    """
    Ollama-based LLM service adapter for LUMEN.
    Uses Ollama HTTP API (default: http://localhost:11434).
    """

    def __init__(self):
        self.base_url: str = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model_name: str = settings.OLLAMA_MODEL
        self.temperature: float = getattr(settings, "OLLAMA_TEMPERATURE", 0.2)
        self.timeout: int = getattr(settings, "OLLAMA_TIMEOUT", 120)

    async def _call(self, prompt: str) -> str:
        """
        Low-level call to Ollama. Returns raw model text.
        """
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": self.temperature,
            },
        }

        timeout = aiohttp.ClientTimeout(total=self.timeout)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as resp:
                resp.raise_for_status()
                data = await resp.json()

        # Ollama returns: {"response": "...", "done": true, ...}
        return data.get("response", "")

    async def analyze_columns(self, df_sample: pd.DataFrame) -> Dict[str, Any]:
        column_data = []
        for col in df_sample.columns:
            column_data.append(
                {
                    "name": col,
                    "samples": df_sample[col].dropna().head(5).tolist(),
                    "dtype": str(df_sample[col].dtype),
                }
            )

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

        response_text = await self._call(prompt)

        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return {col: {"type": "unknown"} for col in df_sample.columns}

    async def suggest_cleaning(
        self, df_stats: Dict[str, Any], column_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
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

        response_text = await self._call(prompt)
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return []

    async def suggest_models(
        self,
        rows: int,
        cols: int,
        target: str,
        task_type: str,
        column_analysis: Dict[str, Any],
    ) -> Dict[str, Any]:
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

        response_text = await self._call(prompt)
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return {"error": "Failed to generate model suggestions"}

    async def chat(self, question: str, context: Dict[str, Any]) -> str:
        prompt = f"""
        You are LUMEN AI, a helpful data science assistant.

        Current Context (Dataset summary):
        {json.dumps(context, indent=2)}

        User Question: {question}

        Provide a concise, expert answer. Use markdown for formatting.
        """
        return await self._call(prompt)

    async def generate_cleaning_code(
        self, df_sample: pd.DataFrame, column_analysis: Dict[str, Any]
    ) -> str:
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

        response_text = await self._call(prompt)

        if "```python" in response_text:
            response_text = response_text.split("```python")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        return response_text.strip()
