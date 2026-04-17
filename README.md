# Loyalty Travel Optimizer

A full-stack travel optimization app that helps users decide how to redeem loyalty points and pay the remaining amount with cards.

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

Base URL: http://localhost:5001

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

### 1) Install frontend + backend dependencies

From project root:

```bash
npm install
```

### 2) Configure and install RAG service dependencies

From rag_service folder:

```bash
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn python-dotenv groq sentence-transformers faiss-cpu numpy
```

Create rag_service/.env:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3) Run all services

Terminal A (project root, frontend):

```bash
npm run dev
```

Terminal B (project root, optimizer API):

```bash
npm run server
```

Terminal C (rag_service):

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
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
	- Ensure optimizer API is up on port 5001
- If explanation is missing:
	- Ensure FastAPI RAG service is up on port 8000
	- Ensure GROQ_API_KEY is set in rag_service/.env
- If styles look stale:
	- Restart Vite dev server and hard refresh browser

## Scripts

From project root:

- npm run dev: Start Vite frontend
- npm run server: Start Express optimizer API
- npm run lint: Run ESLint
- npm run build: Build frontend
- npm run preview: Preview production build
