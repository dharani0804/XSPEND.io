from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import (
    Transaction, TransactionRule, User, Account,
    UploadedFile as UploadedFileModel, Category, Goal,
    seed_default_categories, gen_uuid
)
from parser import parse_statement
from ai import get_ai_response
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import traceback

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinanceAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed categories on startup
@app.on_event("startup")
def startup():
    db = next(get_db())
    seed_default_categories(db)
    db.close()

# ── Pydantic models ──

class ChatMessage(BaseModel):
    message: str

class ManualTransaction(BaseModel):
    transaction_date: str
    description: str
    amount: float
    currency: str = "USD"
    category: str = "Uncategorized"
    transaction_type: str = "expense"
    bank_source: str = "Manual Entry"
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    transaction_date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    transaction_type: Optional[str] = None
    bank_source: Optional[str] = None
    notes: Optional[str] = None
    needs_review: Optional[bool] = None
    exclusion_reason: Optional[str] = None
    review_status: Optional[str] = None

class RuleCreate(BaseModel):
    match_field: str = "description"
    match_operator: str = "contains"
    match_value: str
    output_transaction_type: Optional[str] = None
    output_category: Optional[str] = None
    priority: int = 0

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    income_amount: Optional[float] = None
    income_frequency: Optional[str] = None
    currency_code: Optional[str] = None
    payday_day: Optional[str] = None
    selected_goals: Optional[str] = None
    other_goals: Optional[str] = None
    savings_goal_monthly: Optional[float] = None
    savings_goal_weekly: Optional[float] = None
    debt_payoff_goal: Optional[float] = None
    monthly_budget: Optional[float] = None
    # Legacy
    monthly_income: Optional[float] = None
    preferred_currency: Optional[str] = None
    monthly_savings_goal: Optional[float] = None
    weekly_savings_goal: Optional[float] = None

class AccountCreate(BaseModel):
    account_name: str
    account_type: str = "checking"
    institution_name: Optional[str] = None
    last4_masked: Optional[str] = None

# ── Helpers ──

def tx_to_dict(t: Transaction) -> dict:
    return {
        "id": t.id,
        "transaction_id": t.transaction_id,
        "transaction_date": str(t.transaction_date) if t.transaction_date else None,
        "date": str(t.transaction_date) if t.transaction_date else None,
        "description": t.description or t.description_clean,
        "original_description": t.original_description or t.description_raw,
        "amount": t.amount,
        "currency": t.currency or t.currency_code or "USD",
        "category": t.category,
        "category_id": t.category_id,
        "transaction_type": t.transaction_type,
        "classification_confidence": t.classification_confidence,
        "needs_review": t.needs_review,
        "review_status": t.review_status,
        "exclusion_reason": t.exclusion_reason,
        "is_pending": t.is_pending,
        "status": t.status,
        "bank_source": t.bank_source,
        "account_id": t.account_id,
        "uploaded_file_id": t.uploaded_file_id,
        "import_source": t.import_source,
        "is_edited": t.is_user_edited or t.is_edited,
        "notes": t.notes,
        "fingerprint": t.fingerprint,
    }

def get_or_create_profile(db: Session) -> User:
    p = db.query(User).first()
    if not p:
        p = User(user_id=gen_uuid(), full_name="User")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p

# ── Routes ──

@app.get("/")
def root():
    return {"status": "FinanceAI API running"}

# ── Profile ──

@app.get("/profile")
def get_profile(db: Session = Depends(get_db)):
    p = db.query(User).first()
    if not p:
        return {"exists": False}
    return {
        "exists": True,
        "full_name": p.full_name,
        "income_amount": p.income_amount,
        "monthly_income": p.income_amount,
        "income_frequency": p.income_frequency,
        "currency_code": p.currency_code,
        "preferred_currency": p.currency_code,
        "payday_day": p.payday_day,
        "selected_goals": p.selected_goals,
        "other_goals": p.other_goals,
        "savings_goal_monthly": p.savings_goal_monthly,
        "monthly_savings_goal": p.savings_goal_monthly,
        "savings_goal_weekly": p.savings_goal_weekly,
        "debt_payoff_goal": p.debt_payoff_goal,
        "monthly_budget": p.monthly_budget,
    }

@app.post("/profile")
def save_profile(data: ProfileUpdate, db: Session = Depends(get_db)):
    p = get_or_create_profile(db)
    if data.full_name is not None: p.full_name = data.full_name
    if data.income_amount is not None: p.income_amount = data.income_amount
    if data.monthly_income is not None: p.income_amount = data.monthly_income
    if data.income_frequency is not None: p.income_frequency = data.income_frequency
    if data.currency_code is not None: p.currency_code = data.currency_code
    if data.preferred_currency is not None: p.currency_code = data.preferred_currency
    if data.payday_day is not None: p.payday_day = data.payday_day
    if data.selected_goals is not None: p.selected_goals = data.selected_goals
    if data.other_goals is not None: p.other_goals = data.other_goals
    if data.savings_goal_monthly is not None: p.savings_goal_monthly = data.savings_goal_monthly
    if data.monthly_savings_goal is not None: p.savings_goal_monthly = data.monthly_savings_goal
    if data.savings_goal_weekly is not None: p.savings_goal_weekly = data.savings_goal_weekly
    if data.weekly_savings_goal is not None: p.savings_goal_weekly = data.weekly_savings_goal
    if data.debt_payoff_goal is not None: p.debt_payoff_goal = data.debt_payoff_goal
    if data.monthly_budget is not None: p.monthly_budget = data.monthly_budget
    db.commit()
    return {"success": True}

# ── Accounts ──

@app.get("/accounts")
def get_accounts(db: Session = Depends(get_db)):
    return db.query(Account).filter(Account.is_active == True).all()

@app.post("/accounts")
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    acct = Account(
        account_id=gen_uuid(),
        account_name=data.account_name,
        account_type=data.account_type,
        institution_name=data.institution_name,
        last4_masked=data.last4_masked,
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct

# ── Categories ──

@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).filter(Category.is_active == True).order_by(Category.display_order).all()
    return [{"id": c.category_id, "name": c.category_name, "group": c.category_group, "is_default": c.is_system_default} for c in cats]

# ── Upload ──

@app.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    bank_name: str = "Unknown Bank",
    account_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    contents = await file.read()
    print(f"UPLOAD: {file.filename} size={len(contents)} bank={bank_name}")

    rules = db.query(TransactionRule).filter(TransactionRule.active == True).order_by(TransactionRule.priority.desc()).all()
    user_rules = [{"match_field": r.match_field, "match_operator": r.match_operator, "match_value": r.match_value, "output_transaction_type": r.output_transaction_type, "output_category": r.output_category, "priority": r.priority} for r in rules]

    # Create upload record
    upload_rec = UploadedFileModel(
        uploaded_file_id=gen_uuid(),
        file_name=file.filename,
        file_type=file.filename.split(".")[-1].lower(),
        source_type="upload",
        bank_name=bank_name,
        upload_status="processing",
        account_id=account_id,
    )
    db.add(upload_rec)
    db.commit()

    try:
        transactions, detected_bank = parse_statement(file.filename, contents, bank_name, user_rules)
        print(f"PARSED: {len(transactions)} transactions bank={detected_bank}")
    except ValueError as e:
        upload_rec.upload_status = "failed"
        upload_rec.error_message = str(e)
        db.commit()
        return {"success": False, "error": str(e)}
    except Exception as e:
        upload_rec.upload_status = "failed"
        upload_rec.error_message = str(e)
        db.commit()
        print(f"PARSE ERROR: {traceback.format_exc()}")
        return {"success": False, "error": f"Parse error: {str(e)}"}

    # Get category map
    cat_map = {c.category_name: c.category_id for c in db.query(Category).all()}

    saved, skipped, pending_skipped, review_count = [], 0, 0, 0
    max_id = db.query(Transaction).count()

    for t in transactions:
        if t.get("is_pending"):
            pending_skipped += 1
            continue

        fp = t.get("fingerprint")
        if fp:
            existing = db.query(Transaction).filter(Transaction.fingerprint == fp).first()
            if existing:
                skipped += 1
                continue

        try:
            date = datetime.strptime(t["transaction_date"], "%Y-%m-%d").date() if t.get("transaction_date") else None
        except:
            date = None

        max_id += 1
        cat_name = t.get("category", "Uncategorized")
        cat_id = cat_map.get(cat_name)

        tx = Transaction(
            transaction_id=gen_uuid(),
            id=max_id,
            uploaded_file_id=upload_rec.uploaded_file_id,
            account_id=account_id,
            fingerprint=fp,
            fingerprint_hash=fp,
            raw_date=t.get("raw_date"),
            raw_description=t.get("raw_description"),
            raw_amount=t.get("raw_amount"),
            raw_category=t.get("raw_category"),
            description_raw=t.get("raw_description"),
            transaction_date=date,
            amount=t["amount"],
            currency=t.get("currency", "USD"),
            currency_code=t.get("currency", "USD"),
            description=t["description"],
            description_clean=t["description"],
            original_description=t["original_description"],
            merchant_name=t["description"],
            bank_name_raw=detected_bank,
            bank_source=detected_bank,
            transaction_type=t.get("transaction_type", "unknown"),
            category=cat_name,
            category_id=cat_id,
            classification_confidence=t.get("classification_confidence", "low"),
            classification_source="auto",
            needs_review=t.get("needs_review", False),
            review_status="needs_review" if t.get("needs_review") else "reviewed",
            is_pending=False,
            status="posted",
            is_user_edited=False,
            is_edited=False,
            import_source=t.get("import_source", "unknown"),
        )
        db.add(tx)
        saved.append(tx_to_dict(tx))
        if t.get("needs_review"):
            review_count += 1

    db.commit()

    upload_rec.upload_status = "complete"
    upload_rec.transactions_extracted = len(saved)
    upload_rec.duplicates_skipped = skipped
    upload_rec.parse_confidence = 0.9 if detected_bank != "Unknown Bank" else 0.6
    upload_rec.processed_at = datetime.now()
    db.commit()

    print(f"SAVED: {len(saved)} new, {skipped} dupes, {pending_skipped} pending")

    return {
        "success": True,
        "transactions_imported": len(saved),
        "skipped_duplicates": skipped,
        "skipped_pending": pending_skipped,
        "needs_review": review_count,
        "bank_source": detected_bank,
        "uploaded_file_id": upload_rec.uploaded_file_id,
        "transactions": saved,
    }

# ── Transactions ──

@app.get("/transactions")
def get_transactions(include_pending: bool = False, db: Session = Depends(get_db)):
    q = db.query(Transaction)
    if not include_pending:
        q = q.filter(Transaction.is_pending == False)
    txs = q.order_by(Transaction.transaction_date.desc()).all()
    return [tx_to_dict(t) for t in txs]

@app.get("/transactions/review")
def get_review_queue(db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(
        Transaction.needs_review == True,
        Transaction.is_pending == False,
    ).order_by(Transaction.transaction_date.desc()).all()
    return [tx_to_dict(t) for t in txs]

@app.post("/transactions/manual")
def add_manual(tx: ManualTransaction, db: Session = Depends(get_db)):
    from classifier import generate_fingerprint
    try:
        date = datetime.strptime(tx.transaction_date, "%Y-%m-%d").date()
    except:
        date = datetime.today().date()

    fp = generate_fingerprint("manual", str(date), tx.amount, tx.description)
    max_id = db.query(Transaction).count() + 1

    cat_map = {c.category_name: c.category_id for c in db.query(Category).all()}
    cat_id = cat_map.get(tx.category)

    new_tx = Transaction(
        transaction_id=gen_uuid(),
        id=max_id,
        fingerprint=fp,
        fingerprint_hash=fp,
        transaction_date=date,
        description=tx.description,
        description_clean=tx.description,
        description_raw=tx.description,
        original_description=tx.description,
        raw_description=tx.description,
        raw_date=tx.transaction_date,
        raw_amount=str(tx.amount),
        amount=tx.amount,
        currency=tx.currency,
        currency_code=tx.currency,
        category=tx.category,
        category_id=cat_id,
        transaction_type=tx.transaction_type,
        classification_confidence="high",
        classification_source="user",
        needs_review=False,
        review_status="reviewed",
        bank_source=tx.bank_source,
        import_source="manual",
        status="posted",
        notes=tx.notes,
        is_user_edited=False,
        is_edited=False,
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)
    return {"success": True, "transaction": tx_to_dict(new_tx)}

@app.patch("/transactions/{tid}")
def update_transaction(tid: int, update: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tid).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    cat_map = {c.category_name: c.category_id for c in db.query(Category).all()}
    if update.transaction_date:
        try:
            tx.transaction_date = datetime.strptime(update.transaction_date, "%Y-%m-%d").date()
        except:
            pass
    if update.description is not None:
        tx.description = update.description
        tx.description_clean = update.description
    if update.amount is not None:
        tx.amount = update.amount
    if update.currency is not None:
        tx.currency = update.currency
        tx.currency_code = update.currency
    if update.category is not None:
        tx.category = update.category
        tx.category_id = cat_map.get(update.category)
    if update.transaction_type is not None:
        tx.transaction_type = update.transaction_type
    if update.bank_source is not None:
        tx.bank_source = update.bank_source
    if update.notes is not None:
        tx.notes = update.notes
    if update.needs_review is not None:
        tx.needs_review = update.needs_review
    if update.review_status is not None:
        tx.review_status = update.review_status
    if update.exclusion_reason is not None:
        tx.exclusion_reason = update.exclusion_reason
    tx.is_user_edited = True
    tx.is_edited = True
    tx.needs_review = False
    tx.review_status = "reviewed"
    db.commit()
    return {"success": True, "transaction": tx_to_dict(tx)}

@app.delete("/transactions/{tid}")
def delete_transaction(tid: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tid).first()
    if not tx:
        raise HTTPException(404, "Not found")
    db.delete(tx)
    db.commit()
    return {"success": True}

# ── Rules ──

@app.get("/rules")
def get_rules(db: Session = Depends(get_db)):
    rules = db.query(TransactionRule).filter(TransactionRule.active == True).order_by(TransactionRule.priority.desc()).all()
    return [{"id": r.rule_id, "match_field": r.match_field, "match_operator": r.match_operator, "match_value": r.match_value, "output_transaction_type": r.output_transaction_type, "output_category": r.output_category, "priority": r.priority} for r in rules]

@app.post("/rules")
def create_rule(rule: RuleCreate, db: Session = Depends(get_db)):
    new_rule = TransactionRule(
        rule_id=gen_uuid(),
        match_field=rule.match_field,
        match_operator=rule.match_operator,
        match_value=rule.match_value,
        output_transaction_type=rule.output_transaction_type,
        output_category=rule.output_category,
        priority=rule.priority,
        active=True,
    )
    db.add(new_rule)
    db.commit()
    return {"success": True, "rule_id": new_rule.rule_id}

@app.delete("/rules/{rid}")
def delete_rule(rid: str, db: Session = Depends(get_db)):
    rule = db.query(TransactionRule).filter(TransactionRule.rule_id == rid).first()
    if not rule:
        raise HTTPException(404, "Not found")
    db.delete(rule)
    db.commit()
    return {"success": True}

# ── Summary ──

@app.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(Transaction.is_pending == False).all()
    expense_txs = [t for t in txs if t.transaction_type == "expense" and t.amount and t.amount < 0 and not t.exclusion_reason]
    total_spent = sum(abs(t.amount) for t in expense_txs)
    total_income = sum(t.amount for t in txs if t.transaction_type == "income" and t.amount and t.amount > 0)
    debt_payments = sum(abs(t.amount) for t in txs if t.transaction_type in ("loan_payment", "credit_card_payment") and t.amount)
    by_bank = {}
    for t in txs:
        b = t.bank_source or "Unknown"
        if b not in by_bank:
            by_bank[b] = {"transactions": 0, "spent": 0, "income": 0}
        by_bank[b]["transactions"] += 1
        if t.transaction_type == "expense" and t.amount and t.amount < 0:
            by_bank[b]["spent"] += abs(t.amount)
        if t.transaction_type == "income" and t.amount:
            by_bank[b]["income"] += t.amount
    return {
        "total_transactions": len(txs),
        "total_spent": round(total_spent, 2),
        "total_income": round(total_income, 2),
        "debt_payments": round(debt_payments, 2),
        "balance": round(total_income - total_spent, 2),
        "banks": by_bank,
        "needs_review": db.query(Transaction).filter(Transaction.needs_review == True).count(),
    }

# ── Uploaded files history ──

@app.get("/uploads")
def get_uploads(db: Session = Depends(get_db)):
    files = db.query(UploadedFileModel).order_by(UploadedFileModel.uploaded_at.desc()).all()
    return [{
        "id": f.uploaded_file_id,
        "file_name": f.file_name,
        "file_type": f.file_type,
        "bank_name": f.bank_name,
        "status": f.upload_status,
        "transactions_extracted": f.transactions_extracted,
        "duplicates_skipped": f.duplicates_skipped,
        "uploaded_at": str(f.uploaded_at),
        "parse_confidence": f.parse_confidence,
    } for f in files]

# ── Privacy: delete all ──

@app.delete("/data/all")
def delete_all_data(db: Session = Depends(get_db)):
    db.query(Transaction).delete()
    db.query(TransactionRule).delete()
    db.query(UploadedFileModel).delete()
    db.commit()
    return {"success": True, "message": "All data deleted"}

# ── Chat ──

@app.post("/chat")
def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(Transaction.is_pending == False).all()
    tx_list = [{"date": str(t.transaction_date), "description": t.description, "amount": t.amount, "currency": t.currency, "category": t.category, "transaction_type": t.transaction_type, "bank_source": t.bank_source} for t in txs]
    try:
        response = get_ai_response(msg.message, tx_list)
        return {"success": True, "response": response}
    except Exception as e:
        return {"success": False, "error": str(e)}
