"""Held-out evaluation: original vs. optimized prompts, scored by an *independent* judge.

The optimizer hill-climbs on `--loop-judge`. To check it is not just overfitting that judge,
the original and optimized prompts are re-run and re-scored by `--holdout-judge`, a different
model that never saw the optimization trajectory.

    python -m eval.run_eval --target nemotron-120b --loop-judge llama-70b \
        --holdout-judge nemotron-120b --out eval/results.json

Needs real provider keys (GROQ_API_KEY / OPENROUTER_API_KEY). Report the numbers it prints,
including the cases where optimization did not help.
"""
import argparse
import asyncio
import json
import statistics
from pathlib import Path
from typing import Any, Dict, List

from services.optimizer_loop import _score_candidate, run_optimization_loop

PROMPTS_FILE = Path(__file__).with_name("prompts.json")


def summarize(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate per-prompt rows. Each row needs the four scores listed below."""
    n = len(rows)
    loop_deltas = [r["loop_judge_optimized"] - r["loop_judge_original"] for r in rows]
    hold_deltas = [r["holdout_judge_optimized"] - r["holdout_judge_original"] for r in rows]
    return {
        "n_prompts": n,
        "loop_judge_mean_delta": statistics.fmean(loop_deltas) if n else 0.0,
        "holdout_judge_mean_delta": statistics.fmean(hold_deltas) if n else 0.0,
        "holdout_win_rate": sum(d > 0 for d in hold_deltas) / n if n else 0.0,
        "holdout_loss_rate": sum(d < 0 for d in hold_deltas) / n if n else 0.0,
    }


async def evaluate_prompt(prompt: str, args: argparse.Namespace) -> Dict[str, Any]:
    result = await run_optimization_loop(
        prompt, args.target, args.loop_judge, args.optimizer,
        max_iterations=args.iterations, beam_width=args.beam,
    )
    optimized = result["best_prompt"]
    hold_orig = await _score_candidate(prompt, args.target, args.holdout_judge)
    hold_opt = await _score_candidate(optimized, args.target, args.holdout_judge)
    return {
        "original": prompt,
        "optimized": optimized,
        "loop_judge_original": result["baseline_score"],
        "loop_judge_optimized": result["best_score"],
        "holdout_judge_original": hold_orig["overall_score"],
        "holdout_judge_optimized": hold_opt["overall_score"],
    }


async def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--target", required=True, help="model that runs the prompts")
    p.add_argument("--loop-judge", required=True, help="judge the optimizer climbs on")
    p.add_argument("--holdout-judge", required=True, help="independent judge, not used in the loop")
    p.add_argument("--optimizer", default="llama-8b")
    p.add_argument("--iterations", type=int, default=3)
    p.add_argument("--beam", type=int, default=2)
    p.add_argument("--prompts", type=Path, default=PROMPTS_FILE)
    p.add_argument("--out", type=Path, default=Path("eval/results.json"))
    args = p.parse_args()

    prompts = json.loads(args.prompts.read_text())
    rows = []
    for prompt in prompts:  # sequential: free-tier rate limits
        rows.append(await evaluate_prompt(prompt, args))
        print(f"[{len(rows)}/{len(prompts)}] {prompt[:50]!r}")
    summary = summarize(rows)
    args.out.write_text(json.dumps({"config": vars(args) | {"prompts": str(args.prompts), "out": str(args.out)},
                                    "summary": summary, "rows": rows}, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
