import asyncio
import json
from typing import List, Dict, Any, Optional

from llm_router import router
from peem import PEEM_SYSTEM_PROMPT, PEEM_SCHEMA
from prompts.optimizer import get_optimizer_prompt


async def _run_prompt(prompt: str, model: str) -> Dict[str, Any]:
    messages = [{"role": "user", "content": prompt}]
    return await router.get_completion(model_key=model, messages=messages, temperature=0.7)


async def _judge(prompt: str, output: str, judge_model: str) -> Dict[str, Any]:
    messages = [
        {"role": "system", "content": PEEM_SYSTEM_PROMPT},
        {"role": "user", "content": f"### ORIGINAL PROMPT:\n{prompt}\n\n### LLM OUTPUT:\n{output}\n\nEvaluate this based on the PEEM protocol."},
    ]
    result = await router.get_completion(
        model_key=judge_model, messages=messages, temperature=0.2, json_schema=PEEM_SCHEMA
    )
    if "error" in result:
        return {"error": result["error"], "overall_score": 0}
    try:
        return json.loads(result["content"])
    except (json.JSONDecodeError, TypeError):
        return {"error": "Judge LLM returned invalid JSON", "overall_score": 0}


async def _generate_candidate(prompt: str, evaluation: Dict[str, Any], model: str) -> str:
    meta_prompt = get_optimizer_prompt(prompt, evaluation)
    messages = [{"role": "user", "content": meta_prompt}]
    result = await router.get_completion(model_key=model, messages=messages, temperature=0.9)
    content = (result.get("content") or "").strip() if "error" not in result else ""
    if not content:
        # Falling back to the unmodified prompt keeps a live demo alive, but it
        # must never happen silently again: a decommissioned optimizer model
        # (gemma2-9b-it) once made every "rewrite" a no-op and the loop looked
        # like it was working while optimizing nothing.
        print(
            f"[optimizer_loop] WARNING: candidate rewrite via '{model}' failed "
            f"({result.get('error', 'empty content')}) — reusing current best prompt unchanged"
        )
        return prompt
    return content


async def _score_candidate(candidate: str, target_model: str, judge_model: str, stagger: float = 0.0) -> Dict[str, Any]:
    if stagger:
        await asyncio.sleep(stagger)
    run_result = await _run_prompt(candidate, target_model)
    output_text = run_result.get("content", "") if "error" not in run_result else ""
    evaluation = await _judge(candidate, output_text, judge_model)
    overall = evaluation.get("overall_score", 0) if "error" not in evaluation else 0
    return {
        "prompt": candidate,
        "output": output_text,
        "evaluation": evaluation,
        "overall_score": overall,
    }


async def run_optimization_loop(
    prompt: str,
    target_model: str,
    judge_model: str = "llama-8b",
    optimizer_model: str = "llama-8b",
    max_iterations: int = 3,
    beam_width: int = 2,
) -> Dict[str, Any]:
    """
    Iterative, judge-in-the-loop prompt optimization (beam search over candidate
    rewrites, elitism-selected by PEEM's overall_score each round).

    Round 0: score the original prompt as the baseline.
    Round 1..N: generate `beam_width` candidate rewrites from the current best
    prompt + its PEEM evaluation, score all candidates in parallel, keep the
    best-scoring candidate only if it beats the current best (elitism).
    """
    history: List[Dict[str, Any]] = []

    baseline = await _score_candidate(prompt, target_model, judge_model)
    history.append({"iteration": 0, "candidates": [baseline], "chosen": baseline})

    current_best = baseline

    for i in range(1, max_iterations + 1):
        candidate_prompts = await asyncio.gather(
            *[
                _generate_candidate(current_best["prompt"], current_best["evaluation"], optimizer_model)
                for _ in range(beam_width)
            ]
        )
        # Stagger candidates within a round so they don't all hit the shared
        # per-model token-per-minute bucket in the exact same instant.
        candidates = await asyncio.gather(
            *[
                _score_candidate(cp, target_model, judge_model, stagger=idx * 1.2)
                for idx, cp in enumerate(candidate_prompts)
            ]
        )

        round_best = max(candidates, key=lambda c: c["overall_score"])
        improved = round_best["overall_score"] > current_best["overall_score"]
        chosen = round_best if improved else current_best

        history.append(
            {
                "iteration": i,
                "candidates": list(candidates),
                "chosen": chosen,
                "improved": improved,
            }
        )
        current_best = chosen

    return {
        "history": history,
        "best_prompt": current_best["prompt"],
        "best_score": current_best["overall_score"],
        "baseline_score": baseline["overall_score"],
    }
