import json

def generate_fastapi_code(prompt: str, schema: dict, model: str) -> str:
    """
    Generates a complete, runnable FastAPI Python script for the given prompt, schema, and model.
    """
    schema_str = json.dumps(schema, indent=4)
    prompt_escaped = json.dumps(prompt)
    model_escaped = json.dumps(model)
    
    code = f'''from fastapi import FastAPI, HTTPException
import litellm
import json

app = FastAPI(title="PromptChain Generated API")

SCHEMA = {schema_str}

@app.post("/run")
async def run_prompt():
    prompt_text = {prompt_escaped}
    
    try:
        # Note: Set API keys as environment variables before running (e.g., OPENAI_API_KEY)
        response = await litellm.acompletion(
            model={model_escaped},
            messages=[{{"role": "user", "content": prompt_text}}],
            response_format={{"type": "json_schema", "json_schema": {{"name": "OutputSchema", "schema": SCHEMA}}}}
        )
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {{"raw_content": content}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
    return code
