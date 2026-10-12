import json
import os
from fastapi import APIRouter

router = APIRouter()

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prompts", "templates")


@router.get("/api/templates")
def get_templates():
    """Loads all CS-domain prompt templates from prompts/templates/*.json."""
    templates = []
    if not os.path.isdir(TEMPLATES_DIR):
        return {"templates": [], "count": 0}

    for filename in sorted(os.listdir(TEMPLATES_DIR)):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(TEMPLATES_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    templates.extend(data)
        except (json.JSONDecodeError, OSError):
            continue

    return {"templates": templates, "count": len(templates)}
