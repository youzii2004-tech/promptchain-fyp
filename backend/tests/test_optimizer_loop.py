"""Optimizer-loop tests: the elitism rule and the DAG executor, with the router mocked.

These pin down what the "monotonic" claim in the README actually means: the *judge's*
score for the kept prompt never decreases. They say nothing about true prompt quality.
"""
import json
from unittest.mock import AsyncMock, patch

import pytest

from services.dag_executor import execute_dag
from services.optimizer_loop import run_optimization_loop


def _fake_router(scores_by_prompt, rewrites):
    """Router stub: rewrites come from `rewrites` in order, judge scores from `scores_by_prompt`."""
    rewrite_iter = iter(rewrites)

    async def get_completion(model_key, messages, temperature=0.7, json_schema=None, **_):
        if json_schema is not None:  # judge call
            user = messages[-1]["content"]
            prompt = user.split("### ORIGINAL PROMPT:\n", 1)[1].split("\n\n### LLM OUTPUT:", 1)[0]
            return {"content": json.dumps({"overall_score": scores_by_prompt[prompt]})}
        if temperature == 0.9:  # optimizer rewrite call
            return {"content": next(rewrite_iter)}
        return {"content": "output"}  # target model run

    return get_completion


@pytest.fixture(autouse=True)
def no_sleep():
    with patch("services.optimizer_loop.asyncio.sleep", new=AsyncMock()):
        yield


async def test_elitism_never_lowers_judge_score():
    scores = {"base": 60, "worse": 40, "better": 80, "best": 90, "worse2": 10}
    # round 1: [worse, better] -> better wins; round 2: [worse2, best] -> best wins
    rewrites = ["worse", "better", "worse2", "best"]
    with patch("services.optimizer_loop.router.get_completion", new=_fake_router(scores, rewrites)):
        result = await run_optimization_loop("base", "m", "j", "o", max_iterations=2, beam_width=2)

    chosen = [h["chosen"]["overall_score"] for h in result["history"]]
    assert chosen == sorted(chosen), "kept score must be non-decreasing"
    assert result["baseline_score"] == 60
    assert result["best_prompt"] == "best" and result["best_score"] == 90


async def test_regressing_candidates_keep_incumbent():
    scores = {"base": 70, "w1": 20, "w2": 30}
    with patch("services.optimizer_loop.router.get_completion", new=_fake_router(scores, ["w1", "w2"])):
        result = await run_optimization_loop("base", "m", "j", "o", max_iterations=1, beam_width=2)

    assert result["best_prompt"] == "base"
    assert result["best_score"] == 70
    assert result["history"][1]["improved"] is False


async def test_tie_does_not_replace_incumbent():
    scores = {"base": 70, "tie": 70}
    with patch("services.optimizer_loop.router.get_completion", new=_fake_router(scores, ["tie"])):
        result = await run_optimization_loop("base", "m", "j", "o", max_iterations=1, beam_width=1)

    assert result["best_prompt"] == "base"


async def test_dag_rejects_cycles_before_any_llm_call():
    nodes = [
        {"id": "a", "type": "llmNode", "data": {"prompt": "{b}"}},
        {"id": "b", "type": "llmNode", "data": {"prompt": "{a}"}},
    ]
    edges = [{"source": "a", "target": "b"}, {"source": "b", "target": "a"}]
    with patch("services.dag_executor.router.get_completion", new=AsyncMock()) as mock:
        with pytest.raises(ValueError, match="cycles"):
            await execute_dag(nodes, edges)
    mock.assert_not_awaited()


async def test_dag_shared_ancestor_runs_once():
    nodes = [
        {"id": "in", "type": "inputNode", "data": {"value": "hello"}},
        {"id": "left", "type": "llmNode", "data": {"prompt": "L {in}"}},
        {"id": "right", "type": "llmNode", "data": {"prompt": "R {in}"}},
        {"id": "join", "type": "llmNode", "data": {"prompt": "{left} + {right}"}},
    ]
    edges = [
        {"source": "in", "target": "left"},
        {"source": "in", "target": "right"},
        {"source": "left", "target": "join"},
        {"source": "right", "target": "join"},
    ]
    mock = AsyncMock(side_effect=lambda **kw: {"content": "<" + kw["messages"][-1]["content"] + ">"})
    with patch("services.dag_executor.router.get_completion", new=mock):
        await execute_dag(nodes, edges)

    # left, right, join — each executed exactly once despite the diamond
    assert mock.await_count == 3


def test_eval_summary_aggregates_holdout_deltas():
    from eval.run_eval import summarize

    rows = [
        {"loop_judge_original": 60, "loop_judge_optimized": 90, "holdout_judge_original": 60, "holdout_judge_optimized": 70},
        {"loop_judge_original": 70, "loop_judge_optimized": 80, "holdout_judge_original": 70, "holdout_judge_optimized": 60},
        {"loop_judge_original": 50, "loop_judge_optimized": 50, "holdout_judge_original": 50, "holdout_judge_optimized": 50},
    ]
    s = summarize(rows)
    assert s["loop_judge_mean_delta"] == pytest.approx(40 / 3)
    assert s["holdout_judge_mean_delta"] == 0
    assert s["holdout_win_rate"] == pytest.approx(1 / 3)
    assert s["holdout_loss_rate"] == pytest.approx(1 / 3)
