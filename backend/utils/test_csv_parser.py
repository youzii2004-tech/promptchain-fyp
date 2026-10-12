import sys
from csv_parser import parse_csv

def test_csv_parser():
    # Test valid CSV
    valid_csv = "name,age,city\nAlice,30,New York\nBob,25,Los Angeles"
    res1 = parse_csv(valid_csv)
    assert len(res1) == 2, f"Expected 2 rows, got {len(res1)}"
    assert res1[0]["name"] == "Alice", f"Expected Alice, got {res1[0].get('name')}"
    
    # Test empty CSV
    assert parse_csv("") == [], "Expected empty list for empty string"
    assert parse_csv("   ") == [], "Expected empty list for whitespace string"
    
    # Test CSV with only headers
    res2 = parse_csv("name,age,city")
    assert res2 == [], f"Expected empty list for headers only, got {res2}"
    
    # Test invalid CSV value type
    try:
        parse_csv(123)
        assert False, "Should have raised ValueError for non-string input"
    except ValueError as e:
        assert "Input must be a string" in str(e)
        
    print("All tests passed!")

if __name__ == "__main__":
    test_csv_parser()