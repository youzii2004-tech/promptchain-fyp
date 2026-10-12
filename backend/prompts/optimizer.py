def get_optimizer_prompt(original_prompt: str, peem_evaluation: dict) -> str:
    """
    Generates a meta-prompt for an LLM to optimize a given prompt based on PEEM evaluation.
    """
    evaluation_text = ""
    for axis, data in peem_evaluation.items():
        if axis == "overall_score":
            continue
        if not isinstance(data, dict):
            continue
        score = data.get("score", "N/A")
        reasoning = data.get("reasoning", "No reasoning provided.")
        evaluation_text += f"Axis: {axis}\nScore: {score}/10\nReasoning: {reasoning}\n\n"

    meta_prompt = f"""You are an expert prompt engineer. Your task is to rewrite and optimize the given prompt based on its PEEM (Prompt Engineering Evaluation Metrics) evaluation.

ORIGINAL PROMPT:
```
{original_prompt}
```

PEEM EVALUATION:
{evaluation_text}
INSTRUCTIONS:
1. Analyze the PEEM evaluation, focusing on the areas with lower scores.
2. Rewrite the ORIGINAL PROMPT to address the identified flaws and improve the overall quality.
3. OUTPUT ONLY THE NEW OPTIMIZED PROMPT. Do not include any conversational filler, explanations, or markdown formatting like ``` unless it is part of the prompt itself.
"""
    return meta_prompt
