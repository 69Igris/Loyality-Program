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

Then set your real key in rag_service/.env:

```env
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
```

For production backend deployment, include your Vercel domain in CORS_ORIGIN as a comma-separated list:

```env
CORS_ORIGIN=http://localhost:5173,https://your-frontend-domain.vercel.app
```

RAG service env files:

- rag_service/.env
- rag_service/.env.example

Required key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

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
- If styles look stale:
	- Restart Vite dev server and hard refresh browser

## Scripts

Frontend scripts (run from frontend folder):

- npm run dev: Start Vite frontend
- npm run build: Build frontend
- npm run preview: Preview production build

Backend scripts (run from backend folder):

- npm start: Start Express optimizer API
