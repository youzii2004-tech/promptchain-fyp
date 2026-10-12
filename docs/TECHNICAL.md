# PromptChain — Technical Overview

This document describes the actual implementation as it stands for the FYP-I submission: a
FastAPI backend, a React frontend built around React Flow, and a judge-in-the-loop prompt
optimizer that is the core contribution of this phase of the project.

## Stack

- Backend: FastAPI (async), SQLAlchemy ORM with Alembic migrations, SQLite by default
  (`backend/database.py`, `SQLALCHEMY_DATABASE_URL` defaults to `sqlite:///./data/promptchain.db`,
  overridable via `DATABASE_URL` for Postgres in production).
- LLM access: LiteLLM as a provider-agnostic router (`backend/llm_router.py`), currently wired
  to two free-tier providers — Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`,
  `openai/gpt-oss-120b`) and OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`). Model keys
  used throughout the app (`llama-70b`, `llama-8b`, `gpt-oss-120b`, `nemotron-120b`) are an
  internal alias layer defined in `LLMRouter.supported_models`, not the raw provider model IDs.
  This roster was refreshed on 2026-07-22 after live verification found the previous one mostly
  dead: Groq had decommissioned `gemma2-9b-it`, and all three previously-used OpenRouter `:free`
  slugs had gone 404 or paid-only. Free-tier model availability churns fast enough that the
  roster should be re-verified with real completions before any demo.
- Frontend: React 19 with `@xyflow/react` (the current, maintained package for what used to be
  published as `reactflow`) for the DAG canvas, Zustand for state, Monaco for the prompt editor,
  Recharts for the optimization-loop score chart, Tailwind for styling.

### Why LiteLLM instead of the HuggingFace/DistilBERT plan in the original proposal

The original proposal scoped a DistilBERT-based classifier to score prompt quality. That plan
was dropped in favor of LLM-as-judge scoring (see PEEM below) for a concrete reason: judging
prompt quality is an open-ended, multi-dimensional task — clarity, constraint satisfaction,
hallucination resistance, reasoning depth — that does not reduce well to a single classification
label the way a DistilBERT fine-tune would need it to. A general-purpose LLM prompted with a
structured rubric and a JSON schema can produce per-axis scores with written justification for
each one, which a small fine-tuned classifier cannot do without significant labeled training
data that this project does not have. This is a real tradeoff, not a strict upgrade: the judge
model's own reliability becomes part of what's being trusted, which is discussed under
Limitations below.

## DAG executor (`backend/services/dag_executor.py`)

`execute_dag(nodes, edges)` builds a `networkx.DiGraph` from the frontend's node/edge list and
calls `nx.is_directed_acyclic_graph` to reject cycles before running anything. Execution starts
from the graph's leaf nodes (nodes with out-degree zero) and works backward: each node's
`_execute_single_node` coroutine first awaits all of its parent nodes' outputs via
`asyncio.gather`, then substitutes each parent's output into `{node_id}`-style placeholders in
its own prompt text with a regex substitution, then calls `router.get_completion` for `llmNode`
types. `inputNode` types just return a static value; `outputNode` types collect their parents'
outputs into a dict keyed by source node ID.

Memoization is done with a `node_tasks` dict mapping node ID to an `asyncio.Task`: if two
downstream nodes depend on the same upstream node, `get_node_output` returns the same in-flight
task rather than re-running it, so shared ancestors are computed once. This gives real
parallelism for independent branches of the graph (they're separate tasks awaited together via
`asyncio.gather` on the leaf set) but there is no concurrency cap in this file specifically —
unlike the batch runner below, the DAG executor does not wrap its LLM calls in a semaphore. In
practice the graphs built through the UI are small, so this has not been an issue, but it is
worth noting as a real difference from the batch runner rather than claiming both use the same
throttling.

## Batch runner (`backend/services/batch_runner.py`)

`run_batch(prompt_template, model, json_schema, dataset)` runs the same prompt template across
every row of a dataset, substituting `{column_name}` placeholders per row. Concurrency here is
explicitly bounded: `asyncio.Semaphore(5)` is acquired inside `_process_row` before each call to
`router.get_completion`, so at most 5 rows are in flight against the provider at once regardless
of dataset size. Failures are caught per-row (`try`/`except` inside `_process_row`) so one bad
row does not fail the whole batch; the function returns aggregate `successful`/`failed` counts
alongside the full per-row result list.

## PEEM: the judge (`backend/peem.py`)

PEEM (Prompt Engineering Evaluation Metrics) is the fixed 9-axis rubric an LLM is instructed to
apply when scoring a prompt-and-output pair:

1. schema_adherence — did the output follow the requested format?
2. clarity — was the prompt itself clear and unambiguous?
3. edge_case_handling — did the prompt anticipate failure modes?
4. token_efficiency — was the prompt concise without losing meaning?
5. hallucination_resistance — did the prompt constrain the model toward grounded answers?
6. persona_consistency — did the prompt maintain a coherent role/persona if one was set?
7. few_shot_quality — were any examples in the prompt actually useful guidance?
8. constraint_satisfaction — did the output satisfy stated constraints?
9. reasoning_depth — did the prompt elicit appropriate step-by-step reasoning?

These axes are deliberately about prompt engineering, not generic text quality — a rubric built
for grading essays (grammar, tone, length) would not surface whether a prompt handles edge cases
or resists hallucination, which are the failure modes that actually matter when the goal is
reusing a prompt reliably rather than reading one piece of writing.

`PEEM_SYSTEM_PROMPT` instructs the judge model to return each axis as `{score, reasoning}` plus
an `overall_score` as their average, and explicitly caps reasoning to under 20 words per axis to
keep judge calls cheap under free-tier token limits. `PEEM_SCHEMA` is passed to
`router.get_completion` as a JSON schema (`response_format: json_schema`) so the judge's output
is constrained to that structure rather than parsed out of free text. On top of the prompt-level
instruction, `llm_router.py` applies a hard `max_tokens=900` cap to any schema-constrained call
that doesn't specify its own limit, so a verbose judge model cannot blow the per-minute token
budget even if it ignores the conciseness instruction.

## Optimization loop (`backend/services/optimizer_loop.py`)

This is the core mechanism added for FYP-I: `run_optimization_loop` closes the loop between the
PEEM judge and the meta-prompt rewriter (`backend/prompts/optimizer.py`, `get_optimizer_prompt`)
that previously only ran single-shot via the legacy `/api/optimize` route.

The algorithm, concretely:

- Round 0: the original prompt is run against `target_model` and scored by `judge_model` via
  `_score_candidate`. This becomes `current_best`.
- Rounds 1 through `max_iterations` (default 3, capped at 6 by the route's Pydantic validator):
  `beam_width` (default 2, capped at 4) candidate rewrites are generated in parallel via
  `asyncio.gather`, each by calling `optimizer_model` with the meta-prompt built from
  `current_best`'s prompt text and its PEEM evaluation. Each candidate is then run against
  `target_model` and judged, also in parallel, via `_score_candidate`, staggered `idx * 1.2`
  seconds apart within the round to avoid all candidates hitting the same provider's per-minute
  token bucket in the same instant.
- The best-scoring candidate of the round replaces `current_best` only if its `overall_score`
  is strictly greater than the current best's — this is the elitism step. If no candidate beats
  the current best, the current best carries forward unchanged into the next round.
- The function returns the full round-by-round `history` (every candidate and its full PEEM
  breakdown, not just the winner), plus `best_prompt`, `best_score`, and `baseline_score`.

This is a beam search with elitism over a fixed number of rounds: at each round, several
candidate solutions ("beam") are proposed, evaluated, and pruned down to one kept solution;
elitism means the incumbent is never discarded for something worse. The route
(`backend/routes/optimize.py`, `POST /api/optimize/loop`) exposes `judge_model` and
`optimizer_model` as separate parameters deliberately: `optimizer_model` defaults to `llama-8b`
specifically so the model writing candidate rewrites is not competing with the judge model
(`llama-70b` by default) for the same per-model Groq rate-limit bucket in the same round.

One real failure mode worth recording: `_generate_candidate` originally fell back to the
unmodified prompt *silently* when the optimizer call errored. When Groq decommissioned the
then-default optimizer model, every "rewrite" became a no-op — the loop kept judging the same
prompt and score movement was pure judge variance, while looking completely functional in the
UI. This was caught on 2026-07-22 by inspecting the actual candidate texts in the API response
(all identical to the original) rather than trusting the score chart. The fallback now logs a
loud warning, and a post-fix live run on the deployed backend showed genuine rewrites with a
baseline-76 → best-99 climb.

### Relationship to published work

This pattern is not new in the research literature and this project does not claim it is.
Automatic Prompt Engineer (Zhou et al., 2022) proposes generating and scoring candidate
instructions with an LLM and iteratively selecting the best. OPRO — "Large Language Models as
Optimizers" (Yang et al., Google DeepMind, 2023) — frames an LLM as an optimizer that proposes
new solutions conditioned on the trajectory of past solutions and their scores, which is
structurally close to what `run_optimization_loop` does each round. DSPy (Khattab et al.,
Stanford, 2023) formalizes prompt/program optimization against a metric as a first-class
abstraction in a programming framework. What this project does is apply that established
generate-score-select loop pattern to a CS-education tool, wire it to a concrete 9-axis judge
rubric aimed specifically at prompt engineering quality rather than a generic task metric, and
expose the round-by-round trajectory as a live chart in the UI
(`frontend/src/components/OptimizationLoopPanel.tsx`, `OptimizeLoopPanel`'s Recharts line chart
of chosen-score vs. best-candidate-this-round). The contribution claimed here is the applied
integration and visualization, not a new search algorithm or a new theoretical result.

## Template library

`backend/prompts/templates/*.json` holds five files (`algorithms.json`, `debugging.json`,
`system_design.json`, `research.json`, `code_review.json`), each with five starter prompt
templates aimed at CS coursework use cases, served via `GET /api/templates` and surfaced in the
frontend through `TemplateLibrary.tsx` as a searchable picker that loads a template into the
editor on click.

## Deployment

`render.yaml` defines the backend as a Docker-based Render web service on the free plan, and
`netlify.toml` defines the frontend build for Netlify. These configs are written and committed;
whether the app is live at a public URL at any given moment depends on the state of the Render
and Netlify accounts (deployment was in progress at the time of writing — for the presentation,
the fallback is the fully working local run: backend on `127.0.0.1:8000`, frontend via Vite,
both verified end-to-end).

## Data model

`backend/models.py` defines four SQLAlchemy tables: `User`, `Prompt` (owned by a user), a
`PromptVersion` per prompt (content, model used, timestamp), and `Evaluation` records tied to a
specific `PromptVersion` storing the full 9-axis PEEM scores as JSON plus `overall_score` and
`judge_model` for quick lookup. This is the persistence layer for saved/versioned prompts; the
optimization loop's in-memory `history` is not currently persisted to these tables — it is
returned directly in the API response for the frontend chart to render.

## Limitations

These are current, real limitations of the FYP-I build, not hedging language:

- The PEEM judge's scores are only as reliable as the underlying LLM's own judgment. No
  inter-rater reliability study has been run — there is no comparison yet against a second
  independent judge model or against human raters to establish how consistent or trustworthy a
  single judge's score actually is. Scores should be read as one model's structured opinion, not
  ground truth.
- Free-tier rate limits (Groq's per-model tokens-per-minute cap, OpenRouter's free-tier request
  limits) constrain how large `beam_width` and `max_iterations` can practically be set for a
  live demo without triggering retries or delays. The API allows up to `beam_width=4` and
  `max_iterations=6`, but a live demo run needs to stay well under that to finish in a reasonable
  time without hitting rate limits repeatedly, even with the retry-with-backoff logic in
  `llm_router.py` and the inter-candidate stagger in `optimizer_loop.py`.
- No formal user study has been conducted. This is explicitly out of scope for FYP-I and is
  planned for FYP-II, where the original proposal's user-study component would be re-scoped to
  evaluate the optimizer's actual effect on prompt quality with real users, rather than testing
  the earlier IDE-style concept.
- The DAG executor has no concurrency cap of its own (see above); this is fine for the small
  graphs the UI currently produces but would need a semaphore, similar to the batch runner's, if
  graphs grow large enough to risk provider rate limits.
- SQLite in the current deployment config (`render.yaml`, free tier, no persistent disk) resets
  on redeploy or restart. This is acceptable for a demo but means saved prompt history is not
  durable in the current deployment target.

## What is planned but not built (FYP-II scope)

Stated explicitly so it is not confused with what exists now: a stronger search strategy beyond
fixed-width beam search (moving toward the fuller evolutionary/iterative approach OPRO
describes), a proper per-CS-domain benchmark suite to evaluate optimizer performance
quantitatively rather than on ad hoc example prompts, the real user study the original proposal
promised (now scoped to measure the optimizer's actual effect on prompt outcomes), and possibly
a cost/quality-aware routing model across the available providers.
