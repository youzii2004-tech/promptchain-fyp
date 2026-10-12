import json
from typing import Dict, Any, Optional

def generate_curl_code(prompt: str, schema: Optional[Dict[str, Any]], model: str) -> str:
    """
    Generates a curl command to call an OpenAI-compatible API.
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }
    
    if schema:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "custom_schema",
                "schema": schema,
                "strict": True
            }
        }
    
    payload_json = json.dumps(payload)
    # Escape single quotes in JSON string to avoid breaking the bash single-quoted string
    payload_escaped = payload_json.replace("'", "'\\''")
    
    curl_command = f"""curl -X POST "https://api.openai.com/v1/chat/completions" \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer $OPENAI_API_KEY" \\
     -d '{payload_escaped}'"""
     
    return curl_command
