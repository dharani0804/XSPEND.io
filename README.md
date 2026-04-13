# xspend

Personal finance app that turns bank statements into spending clarity.

## Stack
- Frontend: React 18 + Vite (inline styles, DM Sans)
- Backend: FastAPI + SQLite + SQLAlchemy
- AI: Claude API (Anthropic)

## Features
- PDF parsing (Amex, Chase, BofA) — no Claude needed, XY position-based
- 9-step transaction classifier (57/57 tests passing)
- Credit matching engine (Amex benefit credits auto-matched)
- Dashboard with spending breakdown, trends, insights
- Projects (tag transactions by intent — like playlists)
- JWT auth

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

## Domain
xspend.io
