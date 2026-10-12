from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from generators.python_fastapi import generate_fastapi_code
from generators.js_nextjs import generate_nextjs_code
from generators.curl_bash import generate_curl_code

router = APIRouter()

class ExportRequest(BaseModel):
    prompt: str
    model: str
    json_schema: Optional[Dict[str, Any]] = None

@router.post("/api/export")
def export_code(request: ExportRequest):
    try:
        python_code = generate_fastapi_code(request.prompt, request.json_schema or {}, request.model)
        nextjs_code = generate_nextjs_code(request.prompt, request.json_schema or {}, request.model)
        curl_code = generate_curl_code(request.prompt, request.json_schema or {}, request.model)
        
        return {
            "python": python_code,
            "nextjs": nextjs_code,
            "curl": curl_code
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
