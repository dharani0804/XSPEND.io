# xspend

Personal finance app built around awareness — not budgets, not shame.

**Status:** v1 in development · Phase 1 of dashboard redesign shipped · 2-month MVP target.

## Documentation

- **Product spec:** [`docs/PRODUCT.md`](docs/PRODUCT.md) — canonical product document (start here)
- **Dashboard design:** [`docs/dashboard-redesign-v1.md`](docs/dashboard-redesign-v1.md) — design principles and Phase 1-4 plan
- **Domain:** xspend.io

## Stack

- Frontend: React 18 + Vite (inline styles → migrating to Tailwind in v1)
- Backend: FastAPI + SQLAlchemy (SQLite → migrating to Postgres in v1)
- Async: Celery + Redis (planned for v1)
- Auth: Clerk (replacing DIY JWT in v1)
- Hosting: Render + Vercel (v1)

## Features (current)

- Statement parsing: CSV, Excel, PDF, OFX (Chase, Amex tested with real data)
- 29-category canonical classification system with rule-based classifier
- Membership-subscription detection (Walmart+, Amazon Prime, Apple One, etc.)
- Discretionary vs Fixed spending split with ratio-aware microcopy
- Hero KPIs: Spent · Top Category · Biggest Charge
- Editorial insights panel
- Projects — tag transactions by life event (a trip, a move, a wedding)
- Multi-account aggregation with cross-account dedup

## Setup

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `localhost:5173`, backend at `localhost:8000`.

## Architecture

See `docs/PRODUCT.md` §6 for the high-level diagram.

Key code:
- `backend/main.py` — FastAPI endpoints
- `backend/parser.py` — statement parsing + bank detection
- `backend/classifier.py` — rule-based categorization
- `backend/fixed_classifier.py` — recurring/fixed detection + merchant display cleanup
- `backend/insights.py` — insights generation
- `frontend/src/pages/Dashboard.jsx` — main dashboard

## Contributing

This is a private project. Engineers: see `docs/PRODUCT.md` for scope, principles, and the 8-week roadmap.
