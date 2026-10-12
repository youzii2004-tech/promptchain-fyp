import sys
import os

# Add the project root to sys.path so we can import backend.generators.curl_bash
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import shlex
import json
from backend.generators.curl_bash import generate_curl_code

def test_escaping():
    prompt = "A prompt with 'single quotes' and \"double quotes\" and \n newlines."
    schema = {"type": "object", "properties": {"result": {"type": "string", "description": "It's a result"}}}
    model = "gpt-4"
    
    code = generate_curl_code(prompt, schema, model)
    print("Generated Curl:")
    print(code)
    
    # Parse back the code as shell commands
    parts = shlex.split(code)
    
    for i, part in enumerate(parts):
        if part == '-d':
            payload = parts[i+1]
            print("\nExtracted Payload:")
            print(payload)
            # This should be valid JSON
            try:
                parsed = json.loads(payload)
                print("\nParsed JSON successfully!")
                assert parsed["messages"][0]["content"] == prompt
                print("Content matches the original prompt.")
                assert parsed["response_format"]["json_schema"]["schema"]["properties"]["result"]["description"] == "It's a result"
                print("Schema matches the original schema.")
                return 0
            except json.JSONDecodeError as e:
                print(f"JSON Parsing failed: {e}")
                return 1
    return 1

if __name__ == "__main__":
    sys.exit(test_escaping())
