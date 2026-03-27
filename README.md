# FinanceAI

An AI-powered personal finance tracker built for people who want clarity over their money without giving up their data.

No bank linking. No cloud database. No subscriptions required to get started.

---

## What it does

Upload bank statements from any bank — Chase, American Express, HDFC, Revolut, or any CSV/PDF/XLSX export — and FinanceAI extracts every transaction, categorises it automatically, and surfaces insights about your spending, savings, and debt.

**Core features**

- Multi-format statement ingestion — PDF, CSV, XLSX, XLS
- Auto bank detection from statement content
- Transaction-level extraction — one row per transaction, never statement summaries
- AI-powered categorisation using Claude API
- Automatic deduplication using SHA-256 fingerprinting
- Exclusion engine — payroll, Zelle, Venmo, card payments excluded from spending by default, always editable
- Dashboard with spending breakdown, budget tracking, trend charts, and AI insights
- Debt journey — track multiple debts, payoff projections, and what-if scenarios
- AI chat — ask anything about your spending in plain English
- Fully editable — every transaction, category, and classification can be overridden
- Privacy-first — all data stored locally in SQLite, no external database

---

## Tech stack

<<<<<<< HEAD
### 📎 Upload Any Bank Statement
Drop in a CSV or PDF from any bank, anywhere in the world. FinanceAI parses it instantly — no manual entry, no bank credentials, no linking required. Your statement is never stored; only the transaction data is saved.

### ✏️ Or Enter Transactions Manually
Prefer to add transactions one by one? Use the manual entry form. Every field — date, merchant, amount, currency, category — is editable after saving too.

### 📊 Instant Visual Dashboard
The moment you upload, your dashboard comes alive:
- **Scorecards** — total balance, income, spending, savings rate
- **Monthly bar chart** — income vs spending side by side
- **Category pie chart** — where your money actually goes
- **Transaction table** — every entry, fully editable inline

### 💬 AI Chat Assistant
Ask Claude AI anything about your finances in plain English:
- *"Why did I overspend in January?"*
- *"Where is most of my money going?"*
- *"How much can I realistically save each month?"*

Claude analyses your actual transactions and gives specific, data-driven answers — not generic tips.

### 🎯 Goals & Recommendations
Set savings targets with deadlines. Get AI-generated recommendations tailored to your real spending patterns.

### 💱 Multi-Currency
Works with USD, EUR, GBP, INR. Built for people with accounts across multiple countries.

### 🔒 Private by Default
Your data never leaves your device. No cloud database, no third-party sharing — everything stored locally.

---

## How It Works
```
1. Upload your bank statement (CSV or PDF)
        ↓
2. FinanceAI parses and categorises every transaction
        ↓
3. Your dashboard populates instantly with charts and metrics
        ↓
4. Chat with your AI assistant to understand your spending
        ↓
5. Set goals and get personalised recommendations
```

---

## Current Status

| Feature | Status |
=======
| Layer | Technology |
>>>>>>> f93c625 (docs: update README with full project overview)
|---|---|
| Frontend | React 18 + Vite |
| Styling | Inline styles + Recharts |
| Backend | Python FastAPI |
| Database | SQLite + SQLAlchemy |
| AI | Claude API (Anthropic) — `claude-sonnet-4-6` |
| PDF parsing | pdfplumber |
| Spreadsheet parsing | pandas |

---

## Project structure

```
financeai/
├── frontend/
│   └── src/
│       └── pages/
│           ├── Landing.jsx       # Marketing landing page
│           ├── Onboarding.jsx    # Multi-step setup questionnaire
│           ├── Upload.jsx        # Multi-file upload + review table
│           ├── Dashboard.jsx     # Analytics dashboard
│           ├── Chat.jsx          # AI chat interface
│           ├── Goals.jsx         # Debt journey + what-if calculator
│           └── Navbar.jsx        # Navigation
└── backend/
    ├── main.py                   # FastAPI app + all endpoints
    ├── models.py                 # SQLAlchemy models
    ├── parser.py                 # Multi-format file parser
    ├── ai.py                     # Claude API integration
    ├── classifier.py             # Transaction classification engine
    └── database.py               # SQLite connection
```

---

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- An Anthropic API key — get one at [console.anthropic.com](https://console.anthropic.com)

### Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy pdfplumber pandas python-multipart anthropic pydantic python-dotenv openpyxl
```

Set your API key in `backend/ai.py`:

```python
client = anthropic.Anthropic(api_key="your-api-key-here")
```

Start the backend:

```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## How it works

### Upload pipeline

```
PDF / CSV / XLSX
       ↓
Format detection
       ↓
Parser (pdfplumber / pandas)
       ↓
Full text → Claude API (chunked, overlapping)
       ↓
Raw transactions extracted
       ↓
Normalisation — dates, amounts, descriptions
       ↓
Classification — expense / income / transfer / card payment / loan payment / refund
       ↓
Fingerprint deduplication (SHA-256)
       ↓
Stored in SQLite transactions table
```

### Classification rules

The system uses a rule-based classifier with regex patterns across 12 expense categories. Low-confidence transactions are flagged for review. Users can create persistent classification rules — for example, always classify "NETFLIX" as Subscriptions.

Transactions excluded from spending totals by default:
- Payroll and direct deposits
- Internal transfers
- Zelle, Venmo, wire transfers
- Credit card payments
- Loan payments

All exclusions are visible, editable, and reversible.

### Dashboard metrics

- **Total income** — from user profile only, not inferred from transactions
- **Total expenses** — only `transaction_type = expense` with `amount < 0`
- **Card credits** — Amex credits, Uber One credits etc. excluded from both income and spending
- **Net remaining** — income minus expenses
- **Savings rate** — (income − expenses) / income

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload` | Upload and parse a statement file |
| GET | `/transactions` | All posted transactions |
| PATCH | `/transactions/{id}` | Edit a transaction |
| GET | `/transactions/review` | Low-confidence review queue |
| POST | `/transactions/manual` | Add a manual transaction |
| GET/POST | `/profile` | User profile |
| GET/POST | `/rules` | Classification rules |
| GET | `/categories` | All categories |
| GET | `/accounts` | Bank accounts |
| GET | `/uploads` | Upload history |
| POST | `/chat` | AI chat |
| DELETE | `/data/all` | Delete all data (privacy) |

---

## Supported file formats

| Format | Support | Notes |
|---|---|---|
| CSV | Best | Clean column mapping, fastest processing |
| XLSX / XLS | Best | Multi-sheet support, same column mapping |
| PDF | Good | Claude API extracts transactions from text |
| OFX / QFX | Planned | |
| QIF | Planned | |

---

## Privacy

- All data is stored locally in a SQLite file (`backend/financeai.db`)
- No bank credentials are ever collected
- Uploaded files are never stored — only the extracted transaction rows are saved
- Raw transaction fields are preserved separately from normalised fields
- Users can delete all data at any time via `DELETE /data/all`

---

## Status

**In progress** — core upload, dashboard, debt journey, and AI chat are functional. Auth, deployment, and goals tracking are next.

---

## Resume line

> **FinanceAI** *(In Progress)* — AI-powered personal finance tracker built with React, FastAPI and Claude API; features multi-bank statement ingestion, automatic transaction categorization and conversational spending analysis.

---

## License

MIT
