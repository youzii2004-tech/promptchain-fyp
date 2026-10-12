import json
from typing import List, Dict, Any

def parse_json(content: str) -> List[Dict[str, Any]]:
    """
    Safely parses JSON string content into a list of dictionaries.
    
    Args:
        content (str): The JSON string to parse.
        
    Returns:
        List[Dict[str, Any]]: A list of dictionaries parsed from the JSON string.
        
    Raises:
        ValueError: If the JSON is invalid or if the result is not a list of dictionaries.
    """
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON content: {e}")
        
    if not isinstance(data, list):
        raise ValueError("JSON content must be an array (list).")
        
    for item in data:
        if not isinstance(item, dict):
            raise ValueError("All elements in the JSON array must be objects (dictionaries).")
            
    return data
