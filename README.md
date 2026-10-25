# Loyalty Travel Optimizer

A full-stack travel optimization app that helps users decide how to redeem loyalty points and pay the remaining amount with cards.

## Project Structure

```text
project/
├── frontend/      # React + Vite UI
├── backend/       # Node + Express optimizer API
└── rag_service/   # Python FastAPI explanation service
```

The app combines:

- React + Vite frontend (trip input, JSON upload, strategy dashboard)
- Node.js + Express optimizer API (pricing + redemption engine)
- FastAPI RAG explanation service (human-readable strategy explanation)
- Agentic redemption assistant: Groq tool calling + FAISS policy evidence + deterministic scoring (see below)

## Key Features

- Fixed city-based trip inputs (no free text):
	- Delhi, Mumbai, Bangalore, Goa, Hyderabad, Chennai, Kolkata, Pune
- Route-based controlled flight pricing with deterministic variation
- Hotel pricing with destination demand multipliers
- Bounded redemption math (no blind full-point subtraction)
- Sequential point allocation per program (flight first, then hotel)
- Point usage breakdown returned in API response
- Effective cost clamped to non-negative values

## Architecture

### 1) Frontend (React)

- Route: /
	- Upload JSON profile (cards + loyalty_programs)
	- Select origin and destination from dropdowns
- Route: /results
	- Calls backend optimizer
	- Displays flight plan, hotel plan, savings, and explanation

### 2) Optimizer API (Express)

Base URL: http://localhost:5000

- GET /health
- POST /api/optimize
- POST /api/explain

Both POST routes use the same optimizer controller.

### 3) RAG Service (FastAPI)

Base URL: http://localhost:8000

- POST /explain
- POST /retrieve (scored, citable policy evidence for the agent)

Consumes optimizer context and returns a concise explanation while enforcing strict domain rules (flight points for flights, hotel points for stays, wallet flexible).

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- Python 3.10+

### 1) Install frontend dependencies

From frontend folder:

```bash
cd frontend
npm install
```

### 2) Install backend dependencies

From backend folder:

```bash
cd backend
npm install
```

### 3) Configure and install RAG service dependencies

From rag_service folder:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a local env file from the template:

```bash
cp .env.example .env
```

Then configure rag_service/.env:

```env
PORT=8000
GROQ_API_KEY=your_groq_api_key_here
```

### 4) Run all services

Terminal A (frontend):

```bash
cd frontend
npm run dev
```

Terminal B (backend):

```bash
cd backend
npm start
```

Terminal C (rag_service):

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Environment Files

Frontend env files:

- frontend/.env
- frontend/.env.example
- frontend/.env.production.example

Required key:

```env
VITE_API_URL=http://localhost:5000
```

For production deployments (Vercel), use your hosted backend URL:

```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

Backend env files:

- backend/.env
- backend/.env.example

Supported keys:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173
RAG_SERVICE_URL=http://127.0.0.1:8000
GROQ_API_KEY=your_groq_api_key_here      # assistant planner + narrative (optional)
AGENT_LLM_MODEL=openai/gpt-oss-120b      # any Groq model with tool calling
```

See backend/.env.example for the agent's limits (turns, tool calls, timeouts, rate limit, scoring weights).

For production backend deployment, include your Vercel domain in CORS_ORIGIN as a comma-separated list:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.vercel.app
```

RAG service env files:

- rag_service/.env
- rag_service/.env.example

Supported keys:

```env
PORT=8000
GROQ_API_KEY=your_groq_api_key_here
```

The RAG app reads port from `PORT` (defaults to 8000 if unset).

## Hosting (Vercel + Render)

Files added for hosting:

- frontend/vercel.json: SPA rewrite to index.html
- render.yaml: Render blueprint for backend and rag_service

### Deploy Frontend on Vercel

1. Import repository into Vercel
2. Set root directory to frontend
3. Build command: npm run build
4. Output directory: dist
5. Add env variable:

```env
VITE_API_URL=https://your-backend-domain.onrender.com
```

### Deploy Backend on Render

Render can use the included render.yaml blueprint.

Set these environment variables for backend service:

```env
CORS_ORIGIN=https://your-frontend-domain.vercel.app
RAG_SERVICE_URL=https://your-rag-domain.onrender.com
```

PORT is provided automatically by Render.

### Deploy RAG Service on Render

Set this environment variable for rag service:

```env
GROQ_API_KEY=your_real_groq_key
```

PORT is provided automatically by Render.

## API Contract

Request body for POST /api/optimize:

```json
{
	"trip": {
		"from": "Delhi",
		"to": "Mumbai"
	},
	"userData": {
		"cards": [
			{
				"name": "HDFC Regalia",
				"earn_rate_spend": 100,
				"earn_rate_points": 4,
				"point_value": 0.5
			}
		],
		"loyalty_programs": [
			{
				"name": "MakeMyTrip Wallet",
				"points": 3000,
				"conversion_rate": 1.0,
				"type": "wallet"
			}
		]
	}
}
```

Response includes (truncated):

```json
{
	"summary": "Best Strategy for Delhi → Mumbai",
	"flightPlan": ["..."],
	"hotelPlan": ["..."],
	"savings": 1234.56,
	"effective_cost": 7890.12,
	"pointsUsed": 4567.89,
	"remainingCash": 8123.45,
	"pointsBreakdown": [
		{
			"programName": "MakeMyTrip Wallet",
			"usedForFlight": 3000,
			"usedForHotel": 500,
			"remainingPoints": 0
		}
	],
	"tracking": {
		"pointsUsed": 4567.89,
		"remainingCash": 8123.45,
		"totalSavings": 1234.56,
		"pointsValueUsed": 2300,
		"cardBenefits": 80,
		"flightRemainingCost": 3200,
		"hotelRemainingCost": 4923.45
	},
	"pricing": {
		"routeKey": "delhi-mumbai",
		"flightPrice": 6131.78,
		"hotelPrice": 4809.24,
		"variation": 1
	},
	"explanation": "..."
}
```

## Agentic Redemption Assistant

An **Ask Ledger** button in the bottom-right corner of every page (signed-in users) opens a conversational assistant that plans redemptions with tools instead of only generating text. The panel opens compact over the page; expand it to see the full recommendation, comparison table, math and policy evidence next to the chat. The conversation persists while you move between pages and is cleared when a different user signs in. It is **read-only**: it reads, compares, calculates and recommends; it never books, purchases or transfers points.

### How a request flows

```text
React AssistantWidget ──POST /api/agent/chat (JWT, NDJSON stream)──► Express
  understand   deterministic slot parsing (city, nights, points, preferences) + conversation memory
  clarify      asks a follow-up when an essential (destination, flight origin) is missing
  plan         Groq LLM picks tools from a 4-tool allowlist (bounded turns / calls / timeouts)
  ensure       workflow runs any mandatory step the LLM skipped
  verify       evidence sufficiency, stored-data vs policy conflicts, sample-data notices
  respond      LLM writes from a FACTS block; every number is checked against it, else a template is used
                    │
                    ├─ get_loyalty_balance        Prisma, scoped to req.user.id (never an argument)
                    ├─ search_redemption_options  sample award catalog (backend/agent/catalog.js)
                    ├─ compare_redemptions        deterministic scoring (backend/agent/scoring.js)
                    └─ get_recommendation_context FastAPI POST /retrieve (FAISS + MiniLM)
```

| Module | Responsibility |
|---|---|
| `backend/agent/intent.js` | Slot extraction, clarification rules |
| `backend/agent/tools.js` | Zod-validated (strict) tool schemas, handlers, timeouts |
| `backend/agent/scoring.js` | Value per point, hard constraints, weighted score, head-to-head |
| `backend/agent/catalog.js` | Sample award catalog over `lib/pricing.js` route pricing |
| `backend/agent/workflow.js` | State machine, budgets, trace, conversation memory |
| `backend/agent/narrative.js` | Facts block, numeric fact-check, citation cleanup, templates |
| `backend/agent/llm.js`, `ragClient.js` | Groq REST client and RAG client with timeouts + backoff retries |
| `rag_service/knowledge.py` | Citable policy corpus (ids, titles, program metadata) |

### Scoring

Hard constraints remove an option before scoring: wrong category/destination, no balance in that program, balance below the points price, above a stated points or cash limit. Eligible options get criterion scores in 0–1:

- **value** = option's value ratio ÷ best ratio in the set, where value per point = (cash price − cash payable) ÷ points and ratio = value per point ÷ baseline (your stored conversion rate, else a sample reference value)
- **points** = fewest points in the set ÷ option's points
- **cash** = 1 − cash payable ÷ cash price
- **preference** = share of stated preferences met (nonstop, minimum stars, refundable)
- **reliability** = data-source reliability (sample catalog = 0.6)

`score = 100 × Σ weight × criterion`, with presets `balanced`, `best_value`, `fewer_points`, `lower_cash` (override with `AGENT_SCORING_WEIGHTS`). Wallet and card points are also offered as partial "pay with points" options at their stored conversion rate.

### Data honesty

- There is no live airline/hotel inventory integration. Options come from a **sample catalog** (illustrative award charts over the optimizer's controlled route pricing, 8 Indian cities) and every response says so.
- Balances always come from the database. A points figure typed by the user is only used when nothing is stored, and is labelled as an assumption.
- Policy passages are Ledger's illustrative handbook, not official program terms. Below the relevance threshold nothing is cited and the answer says the policy is unconfirmed.

### Guardrails

Auth required (`requireAuth`), per-user rate limit (`AGENT_RATE_LIMIT_PER_MIN`), strict Zod body + tool-argument validation (unknown keys such as `userId` are rejected), 4-tool allowlist, conversation memory keyed by user id + conversation id (no cross-user resume), slot pinning so the model cannot silently search another city, unknown option ids ignored, tool-call / turn / time budgets, provider error bodies never surfaced, booking claims in LLM output rejected.

### API

`POST /api/agent/chat` with `{ "message": "...", "conversationId": "<uuid from previous reply>" }`. Send `Accept: application/x-ndjson` to stream `phase` and `tool` events followed by `{ "type": "result", "result": {...} }`; otherwise a single JSON result is returned. The result includes `message`, `recommendation`, `alternatives`, `ineligible`, `headToHead`, `calculations`, `evidence`, `evidenceStatus`, `assumptions`, `notices`, `followUps`, `clarification`, `trace` and `usage`.

### Limitations

- Conversation memory is in-process (1 h TTL): it resets on restart and is not shared across replicas.
- Only the 8 supported cities, economy flights and four sample hotel products are modelled.
- Free-tier Groq rate limits can interrupt the LLM planner; the workflow then finishes the steps and the response says so.

## Optimizer Rules

The optimizer enforces these core rules:

1. Bounded points usage

- pointsUsed = min(availablePoints, price / conversionRate)
- pointsValueUsed = pointsUsed * conversionRate
- remainingCost = price - pointsValueUsed

2. Sequential allocation per program

- For each loyalty program:
	- Allocate to flight first
	- Deduct used points
	- Allocate remaining points to hotel
- A point can only be consumed once

3. Final effective cost

- totalCost = flightRemainingCost + hotelRemainingCost - cardBenefits
- effectiveCost = max(0, totalCost)

## Troubleshooting

- If frontend is running but API calls fail:
	- Ensure optimizer API is up on port 5000
- If explanation is missing:
	- Ensure FastAPI RAG service is up on port 8000
	- Ensure GROQ_API_KEY is set in rag_service/.env
- If `npm start` fails with `EADDRINUSE :::5000` on macOS:
	- macOS AirPlay Receiver (ControlCenter) listens on port 5000. Set PORT=5001 in backend/.env and VITE_API_URL=http://localhost:5001 in frontend/.env (or turn off AirPlay Receiver in System Settings → General → AirDrop & Handoff)
- If the assistant says the AI planner was unavailable:
	- Set GROQ_API_KEY in backend/.env and check AGENT_LLM_MODEL is listed for your key (GET https://api.groq.com/openai/v1/models)
- If policy evidence is "unavailable":
	- Ensure the RAG service is running and RAG_SERVICE_URL points at it
- If styles look stale:
	- Restart Vite dev server and hard refresh browser

## Scripts

Frontend scripts (run from frontend folder):

- npm run dev: Start Vite frontend
- npm run build: Build frontend
- npm run preview: Preview production build

Backend scripts (run from backend folder):

- npm start: Start Express optimizer API
- npm test: Agent, scoring, tool, API and optimizer tests (node:test, LLM/RAG/DB mocked)

Frontend tests: `npm test` in frontend (stream parsing and error mapping).

RAG service tests: `python -m pytest tests` in rag_service (deterministic fake embedder, no model download).
