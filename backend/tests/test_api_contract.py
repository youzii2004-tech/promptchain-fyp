"""API contract tests.

The LLM router is mocked, so these run offline, deterministically, and need no API keys.
"""
import pytest
from unittest.mock import AsyncMock, patch

FAKE_COMPLETION = {
    "content": "Contract Verified",
    "usage": {"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7},
    "model": "fake-model",
}


@pytest.mark.asyncio
async def test_get_history_contract(client):
    """/api/history returns a list under the `history` key."""
    response = await client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert "history" in data
    assert isinstance(data["history"], list)


@pytest.mark.asyncio
async def test_run_prompt_contract(client):
    """/api/run returns the completion fields and forwards the request to the router."""
    payload = {"prompt": "Say 'Contract Verified'", "model": "nemotron-120b", "json_schema": None}
    with patch("main.router.get_completion", new=AsyncMock(return_value=FAKE_COMPLETION)) as mock:
        response = await client.post("/api/run", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Contract Verified"
    assert "model" in data
    assert "usage" in data
    assert mock.await_args.kwargs["model_key"] == "nemotron-120b"


@pytest.mark.asyncio
async def test_run_prompt_rejects_unsupported_model(client):
    """An unknown model key is a client error, not a server error."""
    response = await client.post("/api/run", json={"prompt": "hi", "model": "does-not-exist"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_visual_chain_run_contract(client):
    """/api/chain/run resolves {node_id} variables and returns per-node outputs."""
    payload = {
        "nodes": [
            {"id": "in1", "type": "inputNode", "data": {"value": "Hello"}},
            {"id": "llm1", "type": "llmNode", "data": {"prompt": "Say {in1}", "model": "nemotron-120b"}},
        ],
        "edges": [{"id": "e1", "source": "in1", "target": "llm1"}],
    }
    with patch("services.dag_executor.router.get_completion", new=AsyncMock(return_value=FAKE_COMPLETION)) as mock:
        response = await client.post("/api/chain/run", json=payload)

    assert response.status_code == 200
    outputs = response.json()["results"]["node_outputs"]
    assert outputs["in1"] == "Hello"
    assert outputs["llm1"] == "Contract Verified"
    assert mock.await_args.kwargs["messages"][0]["content"] == "Say Hello"
