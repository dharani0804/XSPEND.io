"""
US Bank Statement Parser
Supports: Chase, Bank of America, American Express, Capital One,
          Wells Fargo, Citi, Discover, US Bank, TD Bank, PNC,
          Ally, Apple Card, SoFi, Chime, Marcus
"""

import pdfplumber
import pandas as pd
import io
import re
try:
    from ofxparse import OfxParser
    HAS_OFX = True
except ImportError:
    HAS_OFX = False
from datetime import datetime
from classifier import classify_transaction, generate_fingerprint, normalize_description
from ai import parse_statement_with_claude

# ── US Bank detection keywords ──
US_BANK_PATTERNS = {
    'chase':             'Chase',
    'bank of america':   'Bank of America',
    'bofa':              'Bank of America',
    'bac ':              'Bank of America',
    'american express':  'American Express',
    'amex':              'American Express',
    'capital one':       'Capital One',
    'capitalone':        'Capital One',
    'wells fargo':       'Wells Fargo',
    'wellsfargo':        'Wells Fargo',
    'citibank':          'Citibank',
    'citi bank':         'Citibank',
    'citicards':         'Citibank',
    'discover':          'Discover',
    'us bank':           'US Bank',
    'usbank':            'US Bank',
    'td bank':           'TD Bank',
    'tdbank':            'TD Bank',
    'pnc bank':          'PNC Bank',
    'pnc ':              'PNC Bank',
    'ally bank':         'Ally Bank',
    'ally financial':    'Ally Bank',
    'marcus':            'Marcus by Goldman Sachs',
    'goldman sachs':     'Marcus by Goldman Sachs',
    'apple card':        'Apple Card',
    'sofi':              'SoFi',
    'chime':             'Chime',
    'robinhood':         'Robinhood',
    'schwab':            'Charles Schwab',
    'fidelity':          'Fidelity',
    'navy federal':      'Navy Federal',
    'usaa':              'USAA',
    'regions':           'Regions Bank',
    'suntrust':          'Truist',
    'truist':            'Truist',
    'bbt ':              'Truist',
    'citizens bank':     'Citizens Bank',
    'fifth third':       'Fifth Third Bank',
    'huntington':        'Huntington Bank',
    'keybank':           'KeyBank',
    'comerica':          'Comerica',
    'first republic':    'First Republic',
    'signature bank':    'Signature Bank',
    'synchrony':         'Synchrony Bank',
    'barclays us':       'Barclays US',
}

# OFX Financial Institution ID → Bank name
OFX_FID_MAP = {
    '10898': 'Chase',
    '1001':  'Wells Fargo',
    '1176':  'Bank of America',
    '3101':  'American Express',
    '7000':  'Citibank',
    '815':   'Discover',
    '1461':  'Capital One',
    '5591':  'US Bank',
    '1107':  'TD Bank',
    '2315':  'PNC Bank',
    '3589':  'Ally Bank',
    '101':   'Navy Federal',
    '5163':  'USAA',
}

OFX_TYPE_MAP = {
    'debit':   'expense',
    'credit':  'income',
    'int':     'income',
    'div':     'income',
    'fee':     'expense',
    'srvchg':  'expense',
    'dep':     'income',
    'atm':     'expense',
    'pos':     'expense',
    'xfer':    'transfer',
    'check':   'expense',
    'payment': 'credit_card_payment',
    'cash':    'expense',
    'other':   'unknown',
}

# Banks where expenses are POSITIVE (need sign flip)
POSITIVE_EXPENSE_BANKS = {
    'American Express',
    'Apple Card',
    'Citibank',
    'Discover',
    'Synchrony Bank',
    'Barclays US',
}

# Banks where CSV uses separate Debit/Credit columns
DEBIT_CREDIT_BANKS = {
    'Bank of America',
    'Wells Fargo',
    'Chase',       # some Chase formats
    'US Bank',
    'TD Bank',
    'PNC Bank',
    'Regions Bank',
    'Truist',
    'Citizens Bank',
    'Fifth Third Bank',
    'Huntington Bank',
    'KeyBank',
    'Navy Federal',
    'USAA',
}

def detect_date(val: str) -> str:
    if not val or str(val).strip() in ('', 'nan', 'None'):
        return None
    val = str(val).strip()

    # Handle partial dates MM/YYYY or MM-YYYY → default to 1st of month
    partial_match = re.match(r'^(\d{1,2})[/-](20\d{2})$', val)
    if partial_match:
        month, year = partial_match.groups()
        return f'{year}-{int(month):02d}-01'

    # Handle YYYY/MM or YYYY-MM (no day)
    partial_match2 = re.match(r'^(20\d{2})[/-](\d{1,2})$', val)
    if partial_match2:
        year, month = partial_match2.groups()
        return f'{year}-{int(month):02d}-01'

    # US date formats only
    formats = [
        '%m/%d/%Y', '%m/%d/%y',
        '%Y-%m-%d',
        '%m-%d-%Y', '%m-%d-%y',
        '%B %d %Y', '%b %d %Y',
        '%d %B %Y', '%d %b %Y',
        '%b %d %Y',
        '%m/%Y',
        '%Y%m%d',
    ]
    # Remove commas for formats like 'Mar 15, 2026'
    val_clean = val.replace(',', '').strip()
    for fmt in formats:
        try:
            return datetime.strptime(val_clean, fmt).strftime('%Y-%m-%d')
        except:
            continue
    return None  # Return None instead of raw val — invalid dates excluded

def detect_amount(val) -> float:
    if val is None:
        return 0.0
    s = str(val).strip()
    s = s.replace(',', '').replace('$', '').replace('+', '')
    # Handle parentheses for negatives: (45.00) → -45.00
    if s.startswith('(') and s.endswith(')'):
        s = '-' + s[1:-1]
    try:
        return float(s)
    except:
        return 0.0

def detect_bank_from_text(text: str) -> str:
    lower = text.lower()[:3000]
    for key, name in US_BANK_PATTERNS.items():
        if key in lower:
            return name
    return None

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    col_map = {}
    for col in df.columns:
        low = str(col).lower().strip()
        # Date columns
        if any(x in low for x in ['date', 'posted', 'trans date', 'transaction date', 'activity date', 'posting date']):
            if 'date' not in col_map.values():
                col_map[col] = 'date'
        # Description columns
        elif any(x in low for x in ['description', 'narration', 'details', 'merchant', 'payee', 'memo', 'name', 'transaction']):
            if 'description' not in col_map.values():
                col_map[col] = 'description'
        # Debit column (money out)
        elif any(x in low for x in ['debit', 'withdrawal', 'withdrawals', 'charge', 'payment']):
            if 'debit' not in col_map.values():
                col_map[col] = 'debit'
        # Credit column (money in)
        elif any(x in low for x in ['credit', 'deposit', 'deposits']):
            if 'credit' not in col_map.values():
                col_map[col] = 'credit'
        # Single amount column
        elif any(x in low for x in ['amount', 'amt']):
            if 'amount' not in col_map.values():
                col_map[col] = 'amount'
        # Category
        elif any(x in low for x in ['category', 'cat', 'type']):
            if 'raw_category' not in col_map.values():
                col_map[col] = 'raw_category'
        # Status
        elif any(x in low for x in ['status', 'pending']):
            col_map[col] = 'status'
    return df.rename(columns=col_map)

def fix_amount_for_bank(amount: float, description: str, bank: str, has_debit_credit: bool) -> float:
    """
    Normalize amount sign conventions across US banks.
    Standard: negative = expense, positive = income/deposit
    """
    if has_debit_credit:
        # Already handled in rows_from_dataframe: debit = negative, credit = positive
        return amount

    if bank in POSITIVE_EXPENSE_BANKS:
        # These banks export expenses as positive — flip sign
        # But payments/credits should stay positive
        desc_lower = description.lower()
        is_payment = any(p in desc_lower for p in [
            'payment', 'thank you', 'autopay', 'credit', 'refund',
            'return', 'adjustment', 'reward', 'cash back', 'cashback'
        ])
        if is_payment:
            return -abs(amount)   # payments become negative (money out toward card)
        else:
            return -abs(amount)   # expenses become negative

    return amount

# Financing fees — exclude entirely
FINANCING_FEE_KEYWORDS = [
    'pay over time', 'plan it fee', 'installment fee',
    'cash advance fee', 'balance transfer fee', 'late fee',
    'foreign transaction fee', 'annual membership fee',
    'new pay over time', 'pay over time fee',
]

# Payment/credit summary lines — exclude entirely  
PAYMENT_SUMMARY_KEYWORDS = [
    'payments/credits', 'payments and credits', 'total payments',
    'new balance', 'minimum payment due', 'payment due',
    'statement balance', 'previous balance',
]

def should_exclude_transaction(description: str) -> tuple:
    desc = (description or '').lower().strip()
    for kw in FINANCING_FEE_KEYWORDS:
        if kw in desc:
            return True, 'financing_fee'
    for kw in PAYMENT_SUMMARY_KEYWORDS:
        if kw in desc:
            return True, 'statement_summary'
    return False, None

STATEMENT_CREDIT_PATTERNS_PARSER = [
    r'amex.*credit',
    r'platinum.*credit',
    r'gold.*credit',
    r'clear.*plus.*credit',
    r'amex clear',
    r'platinum.*credit', r'gold.*credit', r'card.*credit',
    r'annual.*credit', r'statement credit', r'travel credit',
    r'digital entertainment credit', r'walmart.*credit',
    r'lululemon credit', r'uber cash', r'saks credit',
    r'cashback', r'cash back reward', r'rewards redemption',
    r'reward credit', r'streaming credit', r'hotel credit',
    r'dining credit', r'clear credit', r'equinox credit',
    r'tsa.*credit', r'global entry credit', r'cell phone credit',
]

def is_statement_credit_parser(description: str) -> bool:
    desc_lower = (description or '').lower()
    return any(re.search(p, desc_lower) for p in STATEMENT_CREDIT_PATTERNS_PARSER)


def skip_non_transaction_row(desc: str, amount: float) -> bool:
    """Filter out balance rows, headers, and summary lines."""
    desc_lower = desc.lower().strip()
    skip_phrases = [
        'opening balance', 'closing balance', 'beginning balance', 'ending balance',
        'previous balance', 'new balance', 'available balance', 'current balance',
        'minimum payment', 'payment due', 'credit limit', 'available credit',
        'total fees', 'total interest', 'finance charge', 'interest charge',
        'annual percentage', 'billing period', 'statement period',
        'account number', 'account summary', 'transaction summary',
        'subtotal', 'total debits', 'total credits', 'total charges',
    ]
    for phrase in skip_phrases:
        if phrase in desc_lower:
            return True
    return False

def rows_from_dataframe(df: pd.DataFrame, bank: str, import_source: str) -> list:
    df = normalize_columns(df)
    has_debit_credit = 'debit' in df.columns or 'credit' in df.columns

    transactions = []
    for _, row in df.iterrows():
        row = row.where(pd.notnull(row), None)

        # Get date
        date_val = row.get('date') or row.get('transaction_date')
        raw_date = str(date_val) if date_val else ''
        parsed_date = detect_date(raw_date)
        if not parsed_date:
            continue

        # Get description
        desc = str(row.get('description') or '').strip()
        if not desc or desc.lower() in ('nan', 'none', ''):
            continue

        # Skip non-transaction rows
        if skip_non_transaction_row(desc, 0):
            continue

        # Get amount
        if has_debit_credit:
            debit = detect_amount(row.get('debit') or 0)
            credit = detect_amount(row.get('credit') or 0)
            if debit and debit != 0:
                amount = -abs(debit)   # debit = money out = negative
            elif credit and credit != 0:
                amount = abs(credit)   # credit = money in = positive
            else:
                continue
        elif 'amount' in df.columns:
            raw_amt = detect_amount(row.get('amount'))
            amount = fix_amount_for_bank(raw_amt, desc, bank, False)
        else:
            continue

        if amount == 0.0:
            continue

        # Get status
        status = str(row.get('status') or 'posted').lower()
        is_pending = 'pending' in status

        # Get category hint from CSV if available
        raw_cat = str(row.get('raw_category') or '').strip()
        if raw_cat.lower() in ('nan', 'none', ''):
            raw_cat = ''

        transactions.append({
            'raw_date': raw_date,
            'raw_description': desc,
            'raw_amount': str(amount),
            'raw_category': raw_cat,
            'external_transaction_id': '',
            'transaction_date': parsed_date,
            'description': desc,
            'original_description': desc,
            'amount': amount,
            'currency': 'USD',
            'is_pending': is_pending,
            'status': 'pending' if is_pending else 'posted',
            'import_source': import_source,
            'bank_source': bank or 'Unknown Bank',
        })
    return transactions

def parse_ofx(file_bytes: bytes, bank_hint: str = None) -> tuple:
    """Parse OFX/QFX files — highest quality input format."""
    if not HAS_OFX:
        raise ValueError('OFX parser not available. Run: pip install ofxparse')

    try:
        ofx = OfxParser.parse(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f'Could not parse OFX/QFX file: {e}')

    # Detect bank from FID
    bank = bank_hint or 'Unknown Bank'
    try:
        fid = str(ofx.account.institution.fid or '')
        org = str(ofx.account.institution.organization or '')
        if fid in OFX_FID_MAP:
            bank = OFX_FID_MAP[fid]
        elif org:
            detected = detect_bank_from_text(org)
            bank = detected or org.title() or bank
    except:
        pass

    transactions = []
    try:
        account_txns = ofx.account.statement.transactions
    except:
        return [], bank

    for t in account_txns:
        try:
            # Date
            raw_date = str(t.date.date()) if t.date else ''
            parsed_date = raw_date if raw_date else None
            if not parsed_date:
                continue

            # Amount — OFX is always correctly signed
            amount = float(t.amount)
            if amount == 0:
                continue

            # Description — use memo if available, else name
            desc = str(t.memo or t.payee or t.id or '').strip()
            if not desc:
                continue

            # Skip balance records
            if skip_non_transaction_row(desc, amount):
                continue

            # Transaction type from OFX type field
            ofx_type = str(t.type or '').lower().strip()
            tx_type_hint = OFX_TYPE_MAP.get(ofx_type, 'unknown')

            # FITID for deduplication — use as external_transaction_id
            fitid = str(t.id or '').strip()

            # Fix sign for positive-expense banks
            amount = fix_amount_for_bank(amount, desc, bank, False)

            transactions.append({
                'raw_date': raw_date,
                'raw_description': desc,
                'raw_amount': str(amount),
                'raw_category': '',
                'external_transaction_id': fitid,
                'transaction_date': parsed_date,
                'description': desc,
                'original_description': desc,
                'amount': amount,
                'currency': 'USD',
                'is_pending': False,
                'status': 'posted',
                'import_source': 'ofx',
                'bank_source': bank,
                '_tx_type_hint': tx_type_hint,  # pass to enrichment
            })
        except Exception as e:
            print(f'OFX transaction parse error: {e}')
            continue

    # Dedup pending vs posted — keep posted, remove pending if same merchant+amount exists
    posted = [t for t in transactions if not t.get('is_pending')]
    pending = [t for t in transactions if t.get('is_pending')]
    for p in pending:
        already_posted = any(
            abs(po['amount'] - p['amount']) < 0.01 and
            (po['description'] or '')[:8].lower() == (p['description'] or '')[:8].lower()
            for po in posted
        )
        if not already_posted:
            posted.append(p)
    transactions = posted

    print(f'OFX parsed: {len(transactions)} transactions from {bank}')
    return transactions, bank


def parse_csv(file_bytes: bytes, bank_hint: str = None) -> tuple:
    # Try multiple encodings
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding, skip_blank_lines=True)
            break
        except:
            continue
    else:
        return [], 'Unknown Bank'

    # Skip extra header rows (some banks have 2-3 rows before real headers)
    # Find the row that looks like real headers
    if len(df.columns) < 2:
        # Try skipping first few rows
        for skip in range(1, 6):
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding='latin-1', skiprows=skip, skip_blank_lines=True)
                if len(df.columns) >= 2:
                    break
            except:
                continue

    # Detect bank from content
    text = ' '.join([str(c).lower() for c in df.columns])
    for row in df.head(5).values:
        text += ' ' + ' '.join([str(v).lower() for v in row if v and str(v) != 'nan'])

    bank = detect_bank_from_text(text) or bank_hint or 'Unknown Bank'
    return rows_from_dataframe(df, bank, 'csv'), bank

def parse_excel(file_bytes: bytes, bank_hint: str = None) -> tuple:
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
    except:
        return [], 'Unknown Bank'

    text = ' '.join([str(c).lower() for c in df.columns])
    for row in df.head(5).values:
        text += ' ' + ' '.join([str(v).lower() for v in row if v and str(v) != 'nan'])

    bank = detect_bank_from_text(text) or bank_hint or 'Unknown Bank'
    return rows_from_dataframe(df, bank, 'xlsx'), bank

def parse_pdf_structured(file_bytes: bytes, bank: str) -> tuple:
    # Try XY parser first for supported banks
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            from pdf_parser_xy import parse_pdf_xy
        bank_lower = (bank or '').lower()
        if any(k in bank_lower for k in ['amex','american express','chase','bofa','bank of america']):
            txs, count = parse_pdf_xy(file_bytes, bank)
            if count > 0:
                print(f'  XY parser got {count} transactions — no Claude needed')
                # Normalize field names — XY parser uses transaction_date, pipeline expects date
                for tx in txs:
                    if 'transaction_date' in tx and 'date' not in tx:
                        tx['date'] = tx['transaction_date']
                return txs, bank
    except Exception as e:
        print(f'  XY parser failed: {e}, falling back to structured')

def parse_pdf_structured_legacy(file_bytes: bytes, bank: str) -> tuple:
    """Try to extract transactions from PDF tables without using Claude API."""
    try:
        import pdfplumber
        transactions = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                # Try table extraction
                tables = page.extract_tables()
                for table in tables:
                    if not table:
                        continue
                    for row in table:
                        if not row or len(row) < 3:
                            continue
                        # Try to find date, description, amount columns
                        date_val = None
                        desc_val = None
                        amt_val = None
                        for cell in row:
                            if not cell:
                                continue
                            cell = str(cell).strip()
                            # Date pattern
                            if re.match(r'\d{1,2}[/\-]\d{1,2}[/\-]?\d{0,4}', cell) and not date_val:
                                date_val = cell
                            # Amount pattern
                            elif re.match(r'^-?\$?[\d,]+\.\d{2}$', cell.replace(',','')):
                                amt_val = cell
                            # Description — longest non-date non-amount string
                            elif len(cell) > 3 and not re.match(r'^[\d\s\$\.\,\-]+$', cell):
                                if not desc_val or len(cell) > len(desc_val):
                                    desc_val = cell
                        if date_val and desc_val and amt_val:
                            try:
                                amt = float(amt_val.replace('$','').replace(',',''))
                                parsed_date = detect_date(date_val)
                                if parsed_date and amt != 0:
                                    transactions.append({
                                        'date': parsed_date,
                                        'description': desc_val,
                                        'amount': amt,
                                    })
                            except:
                                continue
        return transactions, bank
    except Exception as e:
        print(f"  Structured PDF extraction error: {e}")
        return [], bank


def parse_pdf(file_bytes: bytes, filename: str, bank_hint: str = None) -> tuple:
    all_text = ''
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    all_text += '\n' + text
    except Exception as e:
        print(f"PDF read error: {e}")
        return [], 'Unknown Bank'

    if not all_text.strip():
        # Scanned PDF — no extractable text
        raise ValueError(
            "This PDF appears to be a scanned image. Please export your statement as a text-based PDF or CSV from your bank's website."
        )

    bank = detect_bank_from_text(all_text) or bank_hint or 'Unknown Bank'
    print(f"PDF bank detected: {bank}, text length: {len(all_text)}")

    # Try structured table extraction first — faster and no API needed
    raw, detected_bank = parse_pdf_structured(file_bytes, bank)
    if len(raw) >= 5:
        print(f"  Structured extraction: {len(raw)} transactions (no AI needed)")
    else:
        print(f"  Structured extraction got {len(raw)}, falling back to Claude...")
        raw, detected_bank = parse_statement_with_claude(all_text, filename, bank)
    final_bank = detected_bank or bank

    transactions = []
    for t in raw:
        desc = str(t.get('description', '')).strip()
        if not desc:
            continue

        raw_amt = float(t.get('amount', 0))
        if raw_amt == 0:
            continue

        # Fix sign convention for PDF-parsed transactions
        amount = fix_amount_for_bank(raw_amt, desc, final_bank, False)

        if skip_non_transaction_row(desc, amount):
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
            'currency': 'USD',
            'is_pending': False,
            'status': 'posted',
            'import_source': 'pdf',
            'bank_source': final_bank,
        })
    return transactions, final_bank

def load_merchant_rules(db) -> list:
    """Load active merchant rules from DB for classifier."""
    try:
        import sqlalchemy as _sa
        rows = db.execute(_sa.text('''
            SELECT id, user_id, match_field, match_value, match_type,
                   transaction_type, category, priority, source, 
                   confidence_override, is_active
            FROM merchant_rules
            WHERE is_active = 1
            ORDER BY priority DESC, 
            CASE match_type WHEN 'exact' THEN 0 WHEN 'starts_with' THEN 1 WHEN 'contains' THEN 2 ELSE 3 END
        ''')).fetchall()
        return [dict(r._mapping) for r in rows]
    except:
        return []

def enrich_transaction(tx: dict, user_rules: list = None) -> dict:
    # If XY parser already classified as card_credit — trust it
    if tx.get('_source','').endswith('_xy') and tx.get('transaction_type') == 'card_credit':
        tx['category'] = 'Card Credit'
        tx['is_fixed'] = False
        tx['exclusion_reason'] = 'statement_credit'
        return tx

    # Check financing fees and payment summaries FIRST — always exclude
    should_excl, excl_reason = should_exclude_transaction(tx.get('description', ''))
    if should_excl:
        tx['transaction_type'] = 'excluded'
        tx['exclusion_reason'] = excl_reason
        tx.pop('_tx_type_hint', None)
        return tx

    # Check for statement credits first — exclude before any other classification
    if is_statement_credit_parser(tx.get('description', '')):
        tx['transaction_type'] = 'card_credit'
        tx['exclusion_reason'] = 'statement_credit'
        tx['amount'] = abs(tx.get('amount', 0))  # ensure positive
        tx['category'] = 'Card Credit'
        tx['is_fixed'] = False
        tx.pop('_tx_type_hint', None)
        return tx

    tx_type, category, confidence, needs_review = classify_transaction(
        tx['description'], tx['amount'], user_rules
    )
    # OFX provides reliable type hints — use them for high confidence cases
    type_hint = tx.pop('_tx_type_hint', None)
    if type_hint and type_hint != 'unknown' and confidence != 'high':
        tx_type = type_hint
        confidence = 'high'
    # Use CSV category hint if AI classifier is uncertain
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
    bank_hint = bank_name if bank_name and bank_name != 'Unknown Bank' else None

    if fname.endswith('.csv'):
        raw, detected_bank = parse_csv(file_bytes, bank_hint)
    elif fname.endswith(('.xlsx', '.xls')):
        raw, detected_bank = parse_excel(file_bytes, bank_hint)
    elif fname.endswith('.pdf'):
        raw, detected_bank = parse_pdf(file_bytes, filename, bank_hint)
    elif fname.endswith(('.ofx', '.qfx')):
        raw, detected_bank = parse_ofx(file_bytes, bank_hint)
    else:
        raise ValueError('Unsupported format. Please upload CSV, XLSX, XLS, PDF, OFX, or QFX.')

    final_bank = detected_bank or bank_hint or 'Unknown Bank'

    enriched = []
    for tx in raw:
        tx['bank_source'] = final_bank
        enriched.append(enrich_transaction(tx, user_rules))

    return enriched, final_bank
