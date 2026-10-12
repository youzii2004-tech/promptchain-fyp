import asyncio
import re
import litellm
import os
from typing import List, Dict, Any, Optional

# litellm will automatically pick up API keys from the environment variables:
# GROQ_API_KEY, OPENROUTER_API_KEY
# All models below are free-tier / zero-cost as of 2026-07.

class LLMRouter:
    def __init__(self):
        # Define the supported models for the UI to query.
        # Groq = fast inference, good for live demos. OpenRouter's ":free" suffix
        # models give cross-provider diversity without needing a paid key.
        # Roster refreshed 2026-07-22 after live verification: gemma2-9b-it was
        # decommissioned by Groq, and all three previous OpenRouter :free slugs
        # (gemini-2.0-flash-exp, deepseek-chat, qwen-2.5-72b) went 404/paid-only.
        # Every model below returned a real completion with the live keys before
        # being added. Reasoning models that leak <think> blocks or return empty
        # content under token caps (qwen3.6-27b, gpt-oss-20b) were deliberately
        # excluded from optimizer/judge use.
        # NOTE: Groq keys on standard free tier might not have access to Meta Llama models.
        # To maintain seamless compatibility with existing frontend state and DB schema
        # without breaking existing prompt versions, we map 'llama-70b' and 'llama-8b'
        # internally to the active, highly capable GPT-OSS models.
        self.supported_models = {
            "llama-70b": "groq/openai/gpt-oss-120b",
            "llama-8b": "groq/openai/gpt-oss-20b",
            "gpt-oss-120b": "groq/openai/gpt-oss-120b",
            "nemotron-120b": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
            "ollama-llama3.1": "ollama/llama3.1",
        }
        # Default judge model for PEEM scoring — Groq's 70B for speed + quality balance.
        self.default_judge_model = "llama-70b"

    async def get_completion(
        self, 
        model_key: str, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        json_schema: Optional[Dict[str, Any]] = None
    ):
        """
        Routes the prompt to the correct model.
        Supports structured outputs if json_schema is provided.
        Utilizes asynchronous acompletion to prevent blocking the event loop.
        """
        if model_key not in self.supported_models:
            raise ValueError(f"Unsupported model key: {model_key}")
            
        model_name = self.supported_models[model_key]
        
        # Prepare kwargs for the completion call
        kwargs = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
        }
        
        # Configure local Ollama connection if applicable
        ollama_base = os.getenv("OLLAMA_API_BASE", "http://localhost:11434")
        if model_name.startswith("ollama/"):
            kwargs["api_base"] = ollama_base
        
        # Judge/structured calls default to a token cap — combined with PEEM's
        # "concise reasoning" instruction this keeps per-call token burn low,
        # which matters a lot on free-tier per-minute token limits.
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        elif json_schema:
            kwargs["max_tokens"] = 2000

        # If a JSON schema is provided, we try to enforce it.
        # Support for structured outputs varies by model in litellm,
        # but litellm abstracts most of this for OpenAI/Gemini
        if json_schema:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": "UserSchema",
                    "schema": json_schema
                }
            }

        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Use native async completion
                response = await litellm.acompletion(**kwargs)
                return {
                    "content": response.choices[0].message.content,
                    "usage": dict(response.usage) if response.usage else None,
                    "model": response.model
                }
            except litellm.RateLimitError as e:
                if attempt == max_retries - 1:
                    return {"error": str(e)}
                wait_seconds = self._parse_retry_after(str(e)) or (2 ** (attempt + 1))
                await asyncio.sleep(wait_seconds)
            except Exception as e:
                # Catch and format Litellm exceptions
                err_msg = str(e)
                # Elegantly handle local Ollama connection failures with descriptive guidelines
                if model_name.startswith("ollama/") and any(term in err_msg for term in ["ConnectionRefusedError", "Connection refused", "ConnectError", "APIConnectionError"]):
                    return {
                        "error": f"Ollama local server is not running on {ollama_base} or model '{model_name.split('/')[-1]}' is not pulled. Please start Ollama and run 'ollama run {model_name.split('/')[-1]}' locally."
                    }
                return {"error": err_msg}

    @staticmethod
    def _parse_retry_after(error_text: str) -> Optional[float]:
        """Groq/OpenAI-style rate limit errors embed 'try again in 6.08s' — use that
        instead of guessing a fixed backoff when it's available."""
        match = re.search(r"try again in ([\d.]+)s", error_text, re.IGNORECASE)
        if match:
            return float(match.group(1)) + 0.5
        return None

# Singleton instance for the app
router = LLMRouter()
