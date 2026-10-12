import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from utils.csv_parser import parse_csv
from utils.json_parser import parse_json
from services.batch_runner import run_batch

router = APIRouter()

@router.post("/api/batch")
async def process_batch(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    model: str = Form(...),
    json_schema: str = Form(None)
):
    contents = await file.read()
    
    try:
        text_content = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File contents must be valid UTF-8 text.")
    
    if file.filename.endswith(".csv"):
        parsed_data = parse_csv(text_content)
    elif file.filename.endswith(".json"):
        parsed_data = parse_json(text_content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file extension. Only .csv and .json are supported.")
    
    schema_dict = None
    if json_schema:
        try:
            schema_dict = json.loads(json_schema)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format for json_schema.")

    results = await run_batch(
        dataset=parsed_data,
        prompt_template=prompt,
        model=model,
        json_schema=schema_dict
    )
    
    return results
