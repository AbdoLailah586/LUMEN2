import json
from typing import List, Dict, Any

class FeatureSuggester:
    def __init__(self, ai_service: Any):
        self.ai = ai_service

    async def suggest_features(self, column_analysis: Dict[str, Any], target: str | None = None) -> List[Dict[str, Any]]:
        """
        Suggests new features based on existing column semantics.
        """
        prompt = f"""
        Analyze these columns and suggest 3-5 high-value engineered features.
        
        Existing Columns and Meanings:
        {json.dumps(column_analysis, indent=2)}
        
        Target Variable: {target if target else 'Unknown'}
        
        Examples of what to suggest:
        - Combining 'price' and 'quantity' into 'total_revenue'
        - Extracting 'day_of_week' from a date column
        - Creating 'is_alone' from 'family_size'
        - Normalizing 'income' by 'region'
        
        Format as a JSON list:
        [
            {{
                "feature_name": "new_feature_name",
                "formula": "How to calculate it in Python/Pandas",
                "reason": "Why this feature adds value",
                "complexity": "low/medium/high"
            }}
        ]
        """
        
        response_text = await self.ai._call(prompt)
        try:
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            return json.loads(response_text)
        except Exception:
            return []
