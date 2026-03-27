import pdfplumber
import pandas as pd
import io
import re
from datetime import datetime
from classifier import classify_transaction, generate_fingerprint, normalize_description
from ai import parse_statement_with_claude

def detect_date(val: str) -> str:
    if not val or str(val).strip() in ('', 'nan', 'None'):
        return None
    val = str(val).strip()
    formats = [
        '%Y-%m-%d','%m/%d/%Y','%m/%d/%y','%d/%m/%Y','%d-%m-%Y',
        '%B %d, %Y','%b %d, %Y','%d %B %Y','%d %b %Y',
        '%m-%d-%Y','%Y/%m/%d',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val.split(' ')[0], fmt).strftime('%Y-%m-%d')
        except:
            continue
    return val

def detect_amount(val) -> float:
    if val is None:
        return 0.0
    s = str(val).strip().replace(',','').replace('$','').replace('(', '-').replace(')', '')
    try:
        return float(s)
    except:
        return 0.0

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {}
    for col in df.columns:
        low = str(col).lower().strip()
        if any(x in low for x in ['date','posted','trans date','transaction date']):
            col_map[col] = 'date'
        elif any(x in low for x in ['description','narration','details','merchant','payee','memo']):
            if 'description' not in col_map.values():
                col_map[col] = 'description'
        elif 'debit' in low and 'credit' not in low:
            col_map[col] = 'debit'
        elif 'credit' in low and 'debit' not in low:
            col_map[col] = 'credit'
        elif any(x in low for x in ['amount','withdrawal','deposit']):
            if 'amount' not in col_map.values():
                col_map[col] = 'amount'
        elif any(x in low for x in ['currency','curr']):
            col_map[col] = 'currency'
        elif any(x in low for x in ['category','cat']):
            col_map[col] = 'raw_category'
        elif any(x in low for x in ['id','transaction id','ref','reference']):
            col_map[col] = 'external_id'
        elif any(x in low for x in ['pending','status']):
            col_map[col] = 'status'
    return df.rename(columns=col_map)

def rows_from_dataframe(df: pd.DataFrame, import_source: str) -> list:
    df = normalize_columns(df)
    transactions = []
    for _, row in df.iterrows():
        row = row.where(pd.notnull(row), None)
        date_val = row.get('date') or row.get('transaction_date')
        raw_date = str(date_val) if date_val else ''
        parsed_date = detect_date(raw_date)
        desc = str(row.get('description') or '').strip()
        if not desc:
            continue
        if 'amount' in row.index and row.get('amount') is not None:
            amount = detect_amount(row.get('amount'))
        elif 'debit' in row.index or 'credit' in row.index:
            debit = detect_amount(row.get('debit') or 0)
            credit = detect_amount(row.get('credit') or 0)
            amount = credit - debit if (credit or debit) else 0.0
        else:
            amount = 0.0
        if amount == 0.0:
            continue
        currency = str(row.get('currency') or 'USD').strip().upper()
        if len(currency) != 3:
            currency = 'USD'
        status = str(row.get('status') or 'posted').lower()
        is_pending = 'pending' in status
        transactions.append({
            'raw_date': raw_date,
            'raw_description': desc,
            'raw_amount': str(amount),
            'raw_category': str(row.get('raw_category') or ''),
            'external_transaction_id': str(row.get('external_id') or ''),
            'transaction_date': parsed_date,
            'description': desc,
            'original_description': desc,
            'amount': amount,
            'currency': currency,
            'is_pending': is_pending,
            'status': 'pending' if is_pending else 'posted',
            'import_source': import_source,
        })
    return transactions

def detect_bank_from_csv(df: pd.DataFrame) -> str:
    """Try to detect bank name from CSV headers or content"""
    known_banks = {
        'chase': 'Chase', 'bofa': 'Bank of America', 'bank of america': 'Bank of America',
        'wells fargo': 'Wells Fargo', 'citibank': 'Citibank', 'citi': 'Citibank',
        'amex': 'American Express', 'american express': 'American Express',
        'discover': 'Discover', 'capital one': 'Capital One',
        'hdfc': 'HDFC Bank', 'icici': 'ICICI Bank', 'sbi': 'SBI',
        'barclays': 'Barclays', 'hsbc': 'HSBC', 'lloyds': 'Lloyds',
        'revolut': 'Revolut', 'monzo': 'Monzo', 'wise': 'Wise',
    }
    # Check column names and first few rows
    text = ' '.join([str(c).lower() for c in df.columns])
    for row in df.head(3).values:
        text += ' ' + ' '.join([str(v).lower() for v in row if v])
    for key, name in known_banks.items():
        if key in text:
            return name
    return None

def parse_csv(file_bytes: bytes):
    df = pd.read_csv(io.BytesIO(file_bytes), encoding_errors='replace')
    bank = detect_bank_from_csv(df)
    return rows_from_dataframe(df, 'csv'), bank

def parse_excel(file_bytes: bytes):
    df = pd.read_excel(io.BytesIO(file_bytes))
    bank = detect_bank_from_csv(df)
    return rows_from_dataframe(df, 'xlsx'), bank

def parse_pdf(file_bytes: bytes, filename: str):
    all_text = ''
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                all_text += '\n' + text
    if not all_text.strip():
        return [], 'Unknown Bank'
    raw, bank_name = parse_statement_with_claude(all_text, filename)
    transactions = []
    for t in raw:
        desc = str(t.get('description', ''))
        amount = float(t.get('amount', 0))
        if not desc or amount == 0:
            continue
        transactions.append({
            'raw_date': str(t.get('date', '')),
            'raw_description': desc,
            'raw_amount': str(amount),
            'raw_category': str(t.get('category', '')),
            'external_transaction_id': '',
            'transaction_date': str(t.get('date', '')),
            'description': desc,
            'original_description': desc,
            'amount': amount,
            'currency': str(t.get('currency', 'USD')),
            'is_pending': False,
            'status': 'posted',
            'import_source': 'pdf',
        })
    return transactions, bank_name

def enrich_transaction(tx: dict, user_rules: list = None) -> dict:
    tx_type, category, confidence, needs_review = classify_transaction(
        tx['description'], tx['amount'], user_rules
    )
    if tx.get('raw_category') and tx_type == 'expense' and confidence != 'high':
        category = tx['raw_category']
        confidence = 'medium'
    fingerprint = generate_fingerprint(
        tx.get('bank_source', 'unknown'),
        tx.get('transaction_date', ''),
        tx.get('amount', 0),
        tx.get('description', ''),
    )
    return {
        **tx,
        'transaction_type': tx_type,
        'category': category,
        'classification_confidence': confidence,
        'needs_review': needs_review,
        'fingerprint': fingerprint,
    }

def parse_statement(filename: str, file_bytes: bytes, bank_name: str = None, user_rules: list = None):
    fname = filename.lower()
    detected_bank = None

    if fname.endswith('.csv'):
        raw, detected_bank = parse_csv(file_bytes)
    elif fname.endswith(('.xlsx', '.xls')):
        raw, detected_bank = parse_excel(file_bytes)
    elif fname.endswith('.pdf'):
        raw, detected_bank = parse_pdf(file_bytes, filename)
    else:
        raise ValueError('Unsupported format. Accepted: CSV, XLSX, XLS, PDF')

    # Use detected bank name, fall back to user-provided, then Unknown
    final_bank = detected_bank or bank_name or 'Unknown Bank'

    enriched = []
    for tx in raw:
        tx['bank_source'] = final_bank
        enriched.append(enrich_transaction(tx, user_rules))

    return enriched, final_bank
