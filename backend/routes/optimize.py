from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from prompts.optimizer import get_optimizer_prompt
from llm_router import router as llm_router
from services.optimizer_loop import run_optimization_loop

router = APIRouter()

class OptimizeRequest(BaseModel):
    prompt: str
    peem_evaluation: Dict[str, Any]

@router.post("/api/optimize")
async def optimize_prompt(request: OptimizeRequest):
    """Single-shot rewrite (legacy/manual mode) — kept for the standalone Optimize button."""
    try:
        optimizer_prompt = get_optimizer_prompt(request.prompt, request.peem_evaluation)
        messages = [{"role": "user", "content": optimizer_prompt}]
        response = await llm_router.get_completion(model_key="llama-8b", messages=messages)

        if "error" in response:
            raise HTTPException(status_code=500, detail=response["error"])

        return {"optimized_prompt": response.get("content")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class OptimizeLoopRequest(BaseModel):
    prompt: str
    target_model: str = Field(..., description="Model the prompt is actually run against")
    judge_model: str = Field("llama-8b", description="Model used as the PEEM judge (gpt-oss-120b's Groq daily token quota is exhausted as of 2026-08-20)")
    optimizer_model: str = Field("llama-8b", description="Model used to rewrite candidates")
    max_iterations: int = Field(3, ge=1, le=6)
    beam_width: int = Field(2, ge=1, le=4)

@router.post("/api/optimize/loop")
async def optimize_loop(request: OptimizeLoopRequest):
    """
    Judge-in-the-loop iterative prompt optimization: each round generates
    `beam_width` candidate rewrites, scores all of them with the PEEM judge,
    and keeps the best-scoring candidate only if it beats the current best
    (elitism). Returns the full round-by-round history for visualization.
    """
    try:
        result = await run_optimization_loop(
            prompt=request.prompt,
            target_model=request.target_model,
            judge_model=request.judge_model,
            optimizer_model=request.optimizer_model,
            max_iterations=request.max_iterations,
            beam_width=request.beam_width,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
