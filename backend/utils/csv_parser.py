import csv
import io
from typing import List, Dict

def parse_csv(content: str) -> List[Dict[str, str]]:
    """
    Safely parses CSV file contents into a list of dictionaries.
    """
    if not isinstance(content, str):
        raise ValueError("Input must be a string")
        
    content = content.strip()
    if not content:
        return []
        
    try:
        f = io.StringIO(content)
        reader = csv.DictReader(f)
        
        if reader.fieldnames is None:
            return []
            
        return list(reader)
    except csv.Error as e:
        raise ValueError(f"Invalid CSV format: {str(e)}")
    except Exception as e:
        raise ValueError(f"An error occurred while parsing CSV: {str(e)}")
