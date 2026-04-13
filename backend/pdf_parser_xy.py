"""
X/Y position-based PDF parser for bank statements.
Groups words by y-position (row), then assigns to columns by x-position.
No Claude API needed.
"""
import re
import pdfplumber
from typing import List, Dict, Optional, Tuple

# ── Bank column layouts (x positions) ──
BANK_LAYOUTS = {
    'amex': {
        'date':        (45, 95),
        'description': (95, 290),
        'location':    (290, 410),
        'amount':      (480, 560),
        'y_tolerance': 3.0,
    },
    'chase': {
        'date':        (30, 90),
        'description': (90, 400),
        'amount':      (440, 560),
        'y_tolerance': 3.0,
    },
    'bofa': {
        'date':        (25, 75),
        'description': (75, 380),
        'amount':      (420, 560),
        'y_tolerance': 3.0,
    },
    'citi': {
        'date':        (25, 80),
        'description': (80, 370),
        'debit':       (370, 465),
        'credit':      (465, 560),
        'y_tolerance': 3.0,
    },
}

DATE_PATTERN = re.compile(r'^\d{1,2}/\d{1,2}/\d{2,4}$')
AMOUNT_PATTERN = re.compile(r'^\-?\$?[\d,]+\.\d{2}⧫?$')

SKIP_SECTIONS = [
    'payments and credits', 'new charges', 'summary', 'detail',
    'continued on', 'account ending', 'closing date', 'customer care',
    'total payments', 'total new charges', 'minimum payment',
    'please detach', 'payment coupon', 'amount due',
]

def words_to_rows(words: list, y_tolerance: float = 3.0) -> List[List[dict]]:
    """Group words into rows by similar y-position."""
    if not words:
        return []
    
    rows = []
    current_row = [words[0]]
    current_y = words[0]['top']
    
    for word in words[1:]:
        if abs(word['top'] - current_y) <= y_tolerance:
            current_row.append(word)
        else:
            rows.append(sorted(current_row, key=lambda w: w['x0']))
            current_row = [word]
            current_y = word['top']
    
    if current_row:
        rows.append(sorted(current_row, key=lambda w: w['x0']))
    
    return rows

def row_text_in_range(row: list, x_min: float, x_max: float) -> str:
    """Get concatenated text of words within x range."""
    words = [w['text'] for w in row if x_min <= w['x0'] < x_max]
    return ' '.join(words).strip()

def clean_amount(amt_str: str) -> Optional[float]:
    """Parse amount string to float."""
    if not amt_str:
        return None
    cleaned = re.sub(r'[⧫$,\s]', '', amt_str)
    try:
        return float(cleaned)
    except:
        return None

def is_date(text: str) -> bool:
    return bool(DATE_PATTERN.match(text.strip()))

def should_skip_row(text: str) -> bool:
    t = text.lower()
    return any(skip in t for skip in SKIP_SECTIONS)

def parse_amex_xy(pdf_path: str = None, pdf_bytes: bytes = None) -> List[Dict]:
    """Parse Amex PDF using x/y coordinates."""
    layout = BANK_LAYOUTS['amex']
    transactions = []
    
    opener = pdfplumber.open(pdf_path) if pdf_path else pdfplumber.open(__import__('io').BytesIO(pdf_bytes))
    
    with opener as pdf:
        in_charges = False
        in_credits = False
        pending_credit_desc = None
        
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=3, y_tolerance=2)
            rows = words_to_rows(words, y_tolerance=layout['y_tolerance'])
            
            for row in rows:
                row_text = ' '.join(w['text'] for w in row)
                row_lower = row_text.lower()
                
                # Detect sections
                if 'new charges' in row_lower and 'detail' not in row_lower:
                    in_charges = True
                    in_credits = False
                    continue
                if 'payments and credits' in row_lower or ('credits' in row_lower and 'detail' not in row_lower and len(row) < 5):
                    in_credits = True
                    in_charges = False
                    continue
                if should_skip_row(row_text):
                    continue
                
                # Extract fields
                date_text = row_text_in_range(row, *layout['date'])
                desc_text = row_text_in_range(row, *layout['description'])
                amt_text  = row_text_in_range(row, *layout['amount'])
                
                # Skip rows without date
                if not date_text or not is_date(date_text):
                    # Check if this is a continuation description line
                    if desc_text and not amt_text and transactions:
                        # Append to previous transaction description
                        pass
                    continue
                
                amount = clean_amount(amt_text)
                if amount is None:
                    continue
                
                # Skip payment/summary lines
                desc_lower = desc_text.lower()
                if any(kw in desc_lower for kw in ['mobile payment', 'thank you', 'online payment', 'autopay']):
                    continue
                
                # Amex credits section — these are card credits
                if in_credits or 'platinum' in desc_lower or 'credit' in desc_lower.split()[-1:]:
                    if amount < 0 or (in_credits and amount > 0):
                        transactions.append({
                            'transaction_date': normalize_date(date_text),
                            'description': desc_text,
                            'amount': abs(amount),
                            'transaction_type': 'card_credit',
                            'category': 'Card Credit',
                            '_source': 'amex_xy'
                        })
                        continue
                
                # Regular charges
                if in_charges:
                    # Amex exports charges as positive — flip to negative
                    transactions.append({
                        'transaction_date': normalize_date(date_text),
                        'description': desc_text,
                        'amount': -abs(amount),
                        'transaction_type': 'expense',
                        '_source': 'amex_xy'
                    })
    
    return transactions

def normalize_date(date_str: str) -> str:
    """Convert MM/DD/YY or MM/DD/YYYY to YYYY-MM-DD."""
    parts = date_str.replace('*', '').strip().split('/')
    if len(parts) != 3:
        return date_str
    m, d, y = parts
    if len(y) == 2:
        y = '20' + y
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"

def parse_chase_xy(pdf_path: str = None, pdf_bytes: bytes = None) -> List[Dict]:
    """Parse Chase credit card PDF using text extraction."""
    import io
    transactions = []
    
    opener = pdfplumber.open(pdf_path) if pdf_path else pdfplumber.open(io.BytesIO(pdf_bytes))
    
    # Chase date pattern: MM/DD (no year — use statement year)
    CHASE_DATE = re.compile(r'^(\d{2}/\d{2})$')
    CHASE_AMOUNT = re.compile(r'^-?[\d,]+\.\d{2}$')
    
    in_payments = False
    in_purchases = False
    year = None
    statement_month = None  # track the statement closing month
    
    with opener as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
            
            # Extract year from statement — use most common year
            from collections import Counter
            year_matches = re.findall(r'\b(20\d{2})\b', text)
            if year_matches and not year:
                year_counts = Counter(year_matches)
                year = year_counts.most_common(1)[0][0]

            # Extract statement closing month for year boundary detection
            if not statement_month:
                month_match = re.search(
                    r'\b(January|February|March|April|May|June|July|August|'
                    r'September|October|November|December)\s+(20\d{2})\b', text
                )
                if month_match:
                    month_names = ['january','february','march','april','may','june',
                                   'july','august','september','october','november','december']
                    statement_month = month_names.index(month_match.group(1).lower()) + 1
                    year = month_match.group(2)
            
            lines = text.split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                line_lower = line.lower()
                
                # Section detection
                if 'payments and other credits' in line_lower:
                    in_payments = True
                    in_purchases = False
                    continue
                elif 'purchase' in line_lower and len(line) < 30:
                    in_payments = False
                    in_purchases = True
                    continue
                elif any(kw in line_lower for kw in ['interest charges', 'fees charged', 'year-to-date', 'account activity (continued)']):
                    # Don't reset — continued pages still have transactions
                    if 'interest charges' in line_lower or 'year-to-date' in line_lower:
                        in_payments = False
                        in_purchases = False
                    continue
                
                if not (in_payments or in_purchases):
                    continue
                
                # Try to parse: date + description + amount
                # Chase format: "10/01 MERCHANT NAME CITY ST 29.80"
                parts = line.split()
                if len(parts) < 2:
                    continue
                
                # Check first token is date
                if not CHASE_DATE.match(parts[0]):
                    continue
                
                # Last token should be amount
                amt_str = parts[-1]
                if not CHASE_AMOUNT.match(amt_str.replace(',','')):
                    continue
                
                amount = clean_amount(amt_str)
                if amount is None:
                    continue
                
                # Description is everything between date and amount
                # Remove trailing city state patterns e.g. "SEATTLE WA" or "800-123-4567"
                desc_parts = parts[1:-1]
                # Strip trailing 2-letter state code if preceded by city
                if len(desc_parts) >= 2 and len(desc_parts[-1]) == 2 and desc_parts[-1].isupper():
                    desc_parts = desc_parts[:-1]  # remove state
                    if desc_parts and not desc_parts[-1][0].isdigit():
                        desc_parts = desc_parts[:-1]  # remove city
                # Strip trailing phone numbers
                if desc_parts and re.match(r'^\d{3}-\d{3}-\d{4}$', desc_parts[-1]):
                    desc_parts = desc_parts[:-1]
                desc = ' '.join(desc_parts)
                
                # Skip noise
                desc_lower = desc.lower()
                if any(kw in desc_lower for kw in ['payment thank you', 'autopay', 'indian rupee', 'exchg rate', 'x 0.0']):
                    continue
                
                # Determine year — use statement year or infer
                date_str = parts[0]
                m, d = date_str.split('/')
                tx_year = year or '2025'
                tx_month_int = int(m)
                assigned_year = tx_year
                if statement_month and tx_year:
                    stmt_m = int(statement_month)
                    tx_y = int(tx_year)
                    if stmt_m <= 3 and tx_month_int >= 10:
                        assigned_year = str(tx_y - 1)
                    elif stmt_m == 12 and tx_month_int <= 2:
                        assigned_year = str(tx_y + 1)
                full_date = f"{assigned_year}-{m.zfill(2)}-{d.zfill(2)}"
                
                # Chase: payments section has negative=credit, positive=charge
                # Purchases section has positive=expense
                if in_payments:
                    desc_lower = desc.lower()
                    is_actual_payment = any(kw in desc_lower for kw in [
                        'payment thank you', 'autopay', 'online payment',
                        'mobile payment', 'payment received', 'thank you'
                    ])
                    if is_actual_payment:
                        tx_type = 'credit_card_payment'
                        final_amount = amount
                    else:
                        # RAZ*IndiGo, Amazon refunds etc — actual expenses/refunds
                        tx_type = 'expense' if amount < 0 else 'refund'
                        final_amount = amount
                else:
                    tx_type = 'expense'
                    final_amount = -abs(amount)  # Chase exports purchases as positive
                
                transactions.append({
                    'transaction_date': full_date,
                    'description': desc,
                    'amount': final_amount,
                    'transaction_type': tx_type,
                    '_source': 'chase_xy'
                })
    
    return transactions

def parse_bofa_xy(pdf_path: str = None, pdf_bytes: bytes = None) -> List[Dict]:
    """Parse BofA checking/savings PDF using x/y coordinates."""
    transactions = []
    opener = pdfplumber.open(pdf_path) if pdf_path else pdfplumber.open(__import__('io').BytesIO(pdf_bytes))
    
    with opener as pdf:
        in_deposits = False
        in_withdrawals = False
        in_checks = False
        
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=3, y_tolerance=2)
            rows = words_to_rows(words, y_tolerance=3.0)
            
            for row in rows:
                row_text = ' '.join(w['text'] for w in row)
                row_lower = row_text.lower()
                
                # Detect sections
                if 'deposits and other additions' in row_lower:
                    in_deposits = True
                    in_withdrawals = False
                    in_checks = False
                    continue
                elif 'withdrawals and' in row_lower or 'atm and debit' in row_lower or 'other subtractions' in row_lower:
                    in_deposits = False
                    in_withdrawals = True
                    in_checks = False
                    continue
                elif 'checks' in row_lower and len(row) < 4:
                    in_checks = True
                    in_withdrawals = False
                    continue
                elif 'service fees' in row_lower or 'ending balance' in row_lower:
                    in_deposits = False
                    in_withdrawals = False
                    in_checks = False
                    continue
                
                if should_skip_row(row_text):
                    continue
                
                # Extract fields
                date_text = row_text_in_range(row, 30, 88)
                desc_text = row_text_in_range(row, 88, 520)
                amt_text  = row_text_in_range(row, 520, 580)
                
                if not date_text or not is_date(date_text):
                    continue
                if not amt_text:
                    continue
                
                amount = clean_amount(amt_text)
                if amount is None:
                    continue
                
                desc_lower = desc_text.lower()
                
                # Skip internal transfers and noise
                if any(kw in desc_lower for kw in ['total deposits', 'total withdrawals', 'beginning balance', 'ending balance']):
                    continue
                
                # Determine type
                if in_deposits:
                    # Check if it's payroll/income
                    if any(kw in desc_lower for kw in ['stripe', 'payroll', 'direct dep', 'ach credit', 'salary', 'zelle payment from']):
                        tx_type = 'income'
                    else:
                        tx_type = 'income'
                    amount = abs(amount)
                elif in_withdrawals:
                    tx_type = 'expense'
                    amount = -abs(amount)
                else:
                    continue
                
                transactions.append({
                    'transaction_date': normalize_date(date_text),
                    'description': desc_text,
                    'amount': amount,
                    'transaction_type': tx_type,
                    '_source': 'bofa_xy'
                })
    
    return transactions

def parse_pdf_xy(pdf_bytes: bytes, bank: str) -> Tuple[List[Dict], int]:
    """Main entry point — parse PDF by bank using x/y method."""
    bank_lower = (bank or '').lower()
    
    try:
        if 'amex' in bank_lower or 'american express' in bank_lower:
            txs = parse_amex_xy(pdf_bytes=pdf_bytes)
        elif 'chase' in bank_lower:
            txs = parse_chase_xy(pdf_bytes=pdf_bytes)
        elif 'bofa' in bank_lower or 'bank of america' in bank_lower or 'bankofamerica' in bank_lower:
            txs = parse_bofa_xy(pdf_bytes=pdf_bytes)
        else:
            return [], 0
        
        return txs, len(txs)
    except Exception as e:
        print(f"XY parser error: {e}")
        return [], 0
