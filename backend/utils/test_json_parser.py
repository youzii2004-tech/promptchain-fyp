import sys
import os

# Add backend to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.json_parser import parse_json

def run_tests():
    valid_json = '[{"key": "value"}, {"key2": 123}]'
    invalid_json = '{"key": "value"}'
    invalid_list_json = '["string1", "string2"]'
    broken_json = '[{"key": "value"}'
    
    # Test 1: Valid JSON
    try:
        result = parse_json(valid_json)
        assert len(result) == 2
        assert result[0]["key"] == "value"
        print("Test 1 Passed: Valid JSON")
    except Exception as e:
        print(f"Test 1 Failed: {e}")
        sys.exit(1)

    # Test 2: Invalid JSON type (dict instead of list)
    try:
        parse_json(invalid_json)
        print("Test 2 Failed: Should have raised ValueError")
        sys.exit(1)
    except ValueError as e:
        print("Test 2 Passed: Raised ValueError for dict instead of list")

    # Test 3: Invalid list content (strings instead of dicts)
    try:
        parse_json(invalid_list_json)
        print("Test 3 Failed: Should have raised ValueError")
        sys.exit(1)
    except ValueError as e:
        print("Test 3 Passed: Raised ValueError for non-dict list items")

    # Test 4: Broken JSON
    try:
        parse_json(broken_json)
        print("Test 4 Failed: Should have raised ValueError")
        sys.exit(1)
    except ValueError as e:
        print("Test 4 Passed: Raised ValueError for broken JSON")

if __name__ == "__main__":
    run_tests()
    print("All tests passed successfully.")
