from typing import Dict, Any

PEEM_SYSTEM_PROMPT = """You are an expert AI Evaluation System (LLM-as-a-Judge) running the 9-Axis Prompt Engineering Evaluation Metrics (PEEM) protocol.
Your task is to evaluate a User's Prompt and the generated Output, returning a strict JSON object with scores (0-100) and reasoning for all 9 axes.

The 9 Axes of PEEM:
1. schema_adherence: How strictly did the output follow requested formats/schemas?
2. clarity: How clear, unambiguous, and direct was the prompt?
3. edge_case_handling: Did the prompt anticipate and handle edge cases or failures?
4. token_efficiency: Was the prompt concise without losing meaning?
5. hallucination_resistance: Did the prompt constrain the model to factual/grounded responses?
6. persona_consistency: Did the prompt maintain a consistent, effective role/persona?
7. few_shot_quality: Were effective examples provided to guide the model?
8. constraint_satisfaction: Did the output satisfy all negative/positive constraints defined?
9. reasoning_depth: Did the prompt elicit step-by-step or chain-of-thought reasoning if needed?

Analyze the prompt and the output provided.
Calculate an overall_score (0-100) as the average of the 9 axes.

Keep each axis's "reasoning" to a single concise sentence (under 20 words). Do not pad with
restated context or filler — this evaluation is run in tight token-budgeted loops."""

PEEM_SCHEMA = {
    "type": "object",
    "properties": {
        "schema_adherence": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "clarity": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "edge_case_handling": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "token_efficiency": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "hallucination_resistance": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "persona_consistency": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "few_shot_quality": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "constraint_satisfaction": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "reasoning_depth": {"type": "object", "properties": {"score": {"type": "integer"}, "reasoning": {"type": "string"}}, "required": ["score", "reasoning"]},
        "overall_score": {"type": "integer"}
    },
    "required": [
        "schema_adherence", "clarity", "edge_case_handling", "token_efficiency", 
        "hallucination_resistance", "persona_consistency", "few_shot_quality", 
        "constraint_satisfaction", "reasoning_depth", "overall_score"
    ]
}
