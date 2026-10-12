# PromptChain — Autonomous Prompt Optimizer & DAG Engine

![PromptChain FYP Master Banner](docs/showcase/00_promptchain_master_banner.png)

> **Autonomous multi-LLM engineering toolkit and DAG pipeline** built as a BSCS Final Year Project (FYP). Combines 9-axis LLM-as-judge evaluation (PEEM), autonomous judge-in-the-loop prompt mutation with best-candidate elitism, and visual DAG workflow chaining.

[![Live Web App](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=flat-square&logo=netlify)](https://promptchain-fyp.netlify.app/)
[![Backend Status](https://img.shields.io/badge/Backend-FastAPI%20on%20Render-46E3B7?style=flat-square&logo=render)](https://promptchain-backend.onrender.com/health)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20+%20@xyflow/react-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20Async-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)

---

## ⚡ Visual Proof of Work & Core Features

### 1. Multi-Model Prompt Engineering & Monaco IDE Sandbox
Full-featured developer environment for drafting complex prompts, selecting inference backends (Groq `llama-3.3-70b`, `gpt-oss-120b`, OpenRouter `nemotron-120b`), enforcing strict JSON schemas, and streaming model completions in real time.

![Prompt Authoring IDE](docs/showcase/01_showcase_prompt_ide.png)

---

### 2. 9-Axis PEEM LLM-as-Judge & Autonomous Optimization Loop
Closing the prompt engineering feedback loop: an independent LLM judge scores candidate prompts against a 9-axis evaluation rubric (PEEM). Weaknesses are fed into an automated prompt optimizer that iteratively hill-climbs quality scores with strict best-candidate elitism.

![PEEM Evaluation & Optimization Loop](docs/showcase/02_showcase_peem_evaluator.png)

---

### 3. Visual DAG Flow Canvas & Multi-Stage Chaining
Interactive node graph builder powered by `@xyflow/react`. Construct multi-step prompt pipelines with asynchronous dependency resolution, dynamic `{node_id}` variable interpolation, and NetworkX topological cycle validation.

![Visual DAG Flow Canvas](docs/showcase/03_showcase_dag_visual_flow.png)

---

## 🔬 Core Innovations

### 1. 9-Axis PEEM Evaluation Rubric
Unlike generic essay rubrics, PEEM (*Prompt Engineering Evaluation Metrics*) evaluates prompts on the failure modes that actually impact production LLM reliability:
1. **Schema Adherence:** Strict compliance with expected JSON output structures.
2. **Clarity:** Unambiguous directive phrasing without contradictory constraints.
3. **Edge-Case Handling:** Anticipation and mitigation of anomalous or out-of-distribution inputs.
4. **Token Efficiency:** High semantic density without verbosity or token bloat.
5. **Hallucination Resistance:** Grounding constraints that prevent unsupported assertions.
6. **Persona Consistency:** Maintenance of designated system roles throughout execution.
7. **Few-Shot Quality:** Efficacy and representative diversity of in-context examples.
8. **Constraint Satisfaction:** Deterministic compliance with length, tone, and format bounds.
9. **Reasoning Depth:** Elicitation of necessary chain-of-thought or step-by-step logic.

### 2. Autonomous Hill-Climbing with Elitism
The optimization loop executes an automated convergence cycle:
$$\text{Prompt}_0 \xrightarrow{\text{Run}} \text{Output}_0 \xrightarrow{\text{PEEM Judge}} \text{Score}_0 + \text{Critique}_0 \xrightarrow{\text{Mutator}} \text{Prompt}_1 \dots$$
- **Monotonic Quality Guarantee:** Every candidate rewrite is re-judged. Regressors are automatically pruned, guaranteeing that the best-scoring variant is preserved.
- **Token Budget Guardrails:** Structured JSON outputs and hard token caps prevent runaway API consumption.

### 3. NetworkX DAG Execution Engine
- Validates graph topology before firing API calls using `networkx.is_directed_acyclic_graph`.
- Backward leaf-node traversal with `asyncio.gather` executes independent branches in parallel.
- Shared upstream ancestors are memoized into single in-flight tasks.

---

## 🛠️ Stack & Architecture

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, `@xyflow/react` (React Flow), Monaco Editor (`@monaco-editor/react`), Zustand, Recharts, Lucide Icons, Tailwind CSS, Vite |
| **Backend** | FastAPI (async), SQLAlchemy, Pydantic, Alembic, NetworkX, SQLite / PostgreSQL |
| **Inference Router** | LiteLLM provider router (Groq `llama-3.3-70b-versatile`, `gpt-oss-120b`, OpenRouter `nemotron-3-super-120b`) |
| **Deployment** | Netlify (Frontend SPA), Render Blueprint (Backend Docker Web Service) |

---

## 🚀 Local Development Setup

### Backend
```bash
# Navigate to backend and create virtual environment
cd backend
py -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure API keys (copy the template, then fill in your own keys)
copy .env.example .env      # macOS/Linux: cp .env.example .env

# Run migrations and start FastAPI server
alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Tests
```bash
cd backend
pip install -r requirements-dev.txt
pytest
```
The API contract tests mock the LLM router, so they run offline and need no API keys.

### Frontend
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` to explore the IDE locally. Further reading: [`docs/EXPLAINER.md`](docs/EXPLAINER.md) (plain-English overview) and [`docs/TECHNICAL.md`](docs/TECHNICAL.md) (architecture).

---

## 👤 Author

**Muhammad Usaid Siddiqui**  
*BSCS Capstone Project · University of Karachi (UBIT)*  
- Live Project: [promptchain-fyp.netlify.app](https://promptchain-fyp.netlify.app/)  
- Portfolio: [youzii2004-tech.github.io](https://youzii2004-tech.github.io/usaid-dosier/)  
- GitHub: [@youzii2004-tech](https://github.com/youzii2004-tech)

---

## 📄 License

Released under the [MIT License](LICENSE).
