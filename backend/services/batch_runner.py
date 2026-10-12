import asyncio
from typing import List, Dict, Any

try:
    from llm_router import router
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from llm_router import router

async def _process_row(prompt_template: str, model: str, json_schema: dict, row: dict, semaphore: asyncio.Semaphore) -> dict:
    async with semaphore:
        try:
            # Substitute placeholders with row data safely
            prompt = prompt_template
            for key, val in row.items():
                prompt = prompt.replace(f"{{{key}}}", str(val))
            
            # Format prompt as expected messages list
            messages = [{"role": "user", "content": prompt}]

            # Execute the asynchronous get_completion natively
            output = await router.get_completion(
                model_key=model,
                messages=messages,
                json_schema=json_schema
            )
            
            status = "error" if "error" in output else "success"
            return {
                "input": row,
                "output": output,
                "status": status
            }
        except Exception as e:
            return {
                "input": row,
                "output": {"error": str(e)},
                "status": "error"
            }

async def run_batch(prompt_template: str, model: str, json_schema: dict, dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Executes LLM calls in parallel across a dataset.
    """
    semaphore = asyncio.Semaphore(5)  # Limit concurrent requests
    tasks = [
        _process_row(prompt_template, model, json_schema, row, semaphore)
        for row in dataset
    ]
    
    # gather all tasks to run them concurrently
    results = await asyncio.gather(*tasks)
    
    successful = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "error")
    
    return {
        "total": len(dataset),
        "successful": successful,
        "failed": failed,
        "results": list(results)
    }

if __name__ == "__main__":
    # Self-validation dummy test
    class MockRouter:
        async def get_completion(self, model_key, messages, temperature=0.7, max_tokens=None, json_schema=None):
            return {"content": "mock response", "model": model_key}
            
    # Override for test
    router = MockRouter()
    
    async def test():
        dataset = [{"text": "hello"}, {"text": "world"}]
        res = await run_batch("Say {text}", "mock-model", {}, dataset)
        print("Self-validation completed successfully:")
        print(res)
        assert res["total"] == 2
        assert res["successful"] == 2
        
    asyncio.run(test())
