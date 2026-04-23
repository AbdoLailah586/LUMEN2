"""
Natural Language Control for Actions. Parses intent and routes to API executors.
"""
import os
import json
from typing import Dict, Any, List

# Standardizing around the provided prompt API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class LLMAgent:
    def __init__(self):
        """Initializes the Agent wrapper with Memory constraints."""
        self.history: Dict[str, List[Dict[str, str]]] = {}
        
        # We prefer using google-generativeai SDK if available
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
            self.enabled = True
        except ImportError:
            self.enabled = False

    def _get_system_prompt(self, session_context: dict) -> str:
        return f"""
        You are the Core Orchestrator Agent for LUMEN AutoML.
        The user currently has dataset ID {session_context.get('dataset_id', 'None')} uploaded.
        Parse the user's intent and output pure JSON mapping to the internal API actions.
        Valid Intent Actions: ["CLEAN", "ENGINEER", "TRAIN", "ANALYZE_CV", "EXPLAIN"]
        
        Example Output:
        {{
            "intent": "CLEAN",
            "parameters": {{"imputation": "mean", "outliers": "zscore"}}
        }}
        """

    def parse_intent(self, session_id: str, user_input: str, session_context: dict = {}) -> Dict[str, Any]:
        """
        Parses intent string into actionable parameters. Uses conversational memory.
        """
        if not self.enabled or not GEMINI_API_KEY:
            # Fallback mock for local testing without limits
            return {
                "intent": "TRAIN", 
                "parameters": {"models": ["RandomForest"]}
            }
            
        if session_id not in self.history:
            self.history[session_id] = []
            
        self.history[session_id].append({"role": "user", "content": user_input})
        
        # We build a static chat representation for this mock implementation
        prompt = self._get_system_prompt(session_context) + f"\nUser Input: {user_input}"
        
        try:
            response = self.model.generate_content(prompt)
            # Find JSON block
            raw_text = response.text
            start = raw_text.find('{')
            end = raw_text.rfind('}') + 1
            
            if start != -1 and end != 0:
                json_str = raw_text[start:end]
                parsed = json.loads(json_str)
                self.history[session_id].append({"role": "assistant", "content": json_str})
                return parsed
            else:
                return {"intent": "UNKNOWN", "parameters": {}, "error": "LLM failed to output JSON."}
                
        except Exception as e:
            return {"intent": "ERROR", "error": str(e)}

    def execute_intent(self, parsed_intent: Dict[str, Any]) -> Dict[str, Any]:
        """
        Routes the structured JSON into programmatic FastAPI controller logic.
        """
        intent = parsed_intent.get("intent")
        params = parsed_intent.get("parameters", {})
        
        # In a real environment, this invokes the internal python services directly or makes HTTP requests.
        if intent == "CLEAN":
            return {"status": "success", "action_taken": f"Applied cleaning protocol: {params}"}
        elif intent == "ENGINEER":
            return {"status": "success", "action_taken": f"Engineered features using: {params}"}
        elif intent == "TRAIN":
            return {"status": "queued", "action_taken": f"Initiating model training for: {params}"}
        else:
            return {"status": "failure", "action_taken": "Could not understand or execute the parsed action."}
