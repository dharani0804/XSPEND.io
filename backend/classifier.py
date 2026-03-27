import re
from typing import Tuple

# Keywords that indicate each transaction type
INCOME_PATTERNS = [
    r'\b(salary|payroll|paycheck|direct.?deposit|wage|compensation)\b',
    r'\b(dividend|interest.?payment|investment.?return)\b',
    r'\b(freelance|consulting|contract.?pay)\b',
    r'\b(refund|cashback|cash.?back|rebate|reimbursement)\b',
]

TRANSFER_PATTERNS = [
    r'\b(transfer|xfer|wire|ach)\b',
    r'\b(zelle|venmo|paypal|cashapp|cash.?app)\b',
    r'\b(from\s+checking|from\s+savings|to\s+checking|to\s+savings)\b',
    r'\b(internal|between.?account)\b',
]

CREDIT_CARD_PAYMENT_PATTERNS = [
    r'\b(credit.?card.?payment|card.?payment|autopay)\b',
    r'\b(chase|citi|amex|discover|capital.?one).*(payment|pay)\b',
    r'\b(payment\s+thank\s+you|thank\s+you.?payment)\b',
    r'\b(online.?payment|bill.?payment)\b',
]

LOAN_PAYMENT_PATTERNS = [
    r'\b(loan.?payment|mortgage|auto.?loan|student.?loan)\b',
    r'\b(principal|interest.?charge|finance.?charge)\b',
]

REFUND_PATTERNS = [
    r'\b(refund|return|credit|reversal|chargeback)\b',
]

EXPENSE_CATEGORIES = {
    'Food & Dining':     [r'\b(restaurant|cafe|coffee|starbucks|mcdonald|burger|pizza|sushi|taco|diner|bistro|grill|bakery|donut|dunkin|chipotle|subway|wendy|kfc|popeye)\b', r'\bfood\b', r'\beats\b', r'grubhub|doordash|ubereats|instacart'],
    'Groceries':         [r'\b(grocery|groceries|supermarket|safeway|kroger|whole\s*foods|trader\s*joe|costco|walmart|target|aldi|publix|sprout|heb|wegman)\b'],
    'Transport':         [r'\b(uber|lyft|taxi|cab|transit|metro|bart|mta|bus|parking|toll|fuel|gas.?station|chevron|shell|bp|exxon|arco|76.?gas)\b'],
    'Bills & Utilities': [r'\b(electric|utility|water|sewer|gas.?bill|internet|cable|phone|mobile|at.?t|verizon|comcast|xfinity|t.?mobile|sprint|pg.?e|con.?ed|city.?light)\b'],
    'Subscriptions':     [r'\b(netflix|hulu|spotify|apple|amazon.?prime|disney|hbo|youtube|adobe|dropbox|microsoft|google.?one|icloud|subscription)\b'],
    'Health':            [r'\b(pharmacy|drug.?store|cvs|walgreen|rite.?aid|doctor|medical|dental|hospital|clinic|urgent.?care|health|optometry|vision)\b'],
    'Shopping':          [r'\b(amazon|ebay|etsy|walmart|target|bestbuy|best.?buy|nordstrom|macy|gap|zara|h.?m|uniqlo|marshalls|tjmaxx|ross)\b'],
    'Entertainment':     [r'\b(movie|cinema|theater|concert|ticket|event|amusement|bowling|golf|game|steam|playstation|xbox|nintendo)\b'],
    'Travel':            [r'\b(hotel|airbnb|motel|airline|flight|airport|delta|united|southwest|spirit|expedia|booking|airfare|travel)\b'],
    'Personal Care':     [r'\b(salon|spa|barber|haircut|nail|beauty|skincare|cosmetic)\b'],
    'Pets':              [r'\b(petco|petsmart|pet\s+store|veterinary|vet|animal.?hospital|dog|cat.?food)\b'],
    'Education':         [r'\b(tuition|university|college|school|course|udemy|coursera|textbook|education)\b'],
}

EXCLUDE_FROM_SPENDING = {
    TransactionType for TransactionType in [
        'income', 'transfer', 'credit_card_payment', 'loan_payment'
    ]
}

def normalize_description(desc: str) -> str:
    """Clean up description for matching"""
    if not desc:
        return ''
    desc = desc.lower().strip()
    desc = re.sub(r'[#*\-_]+', ' ', desc)
    desc = re.sub(r'\s+', ' ', desc)
    return desc

def classify_transaction(description: str, amount: float, user_rules: list = None) -> Tuple[str, str, str, bool]:
    """
    Returns: (transaction_type, category, confidence, needs_review)
    """
    norm = normalize_description(description)
    amt = float(amount)

    # Apply user rules first (highest priority)
    if user_rules:
        for rule in sorted(user_rules, key=lambda r: -r.get('priority', 0)):
            pattern = rule.get('pattern', '').lower()
            match_type = rule.get('match_type', 'contains')
            if match_type == 'exact' and norm == pattern:
                return rule['transaction_type'] or 'expense', rule['category'], 'high', False
            elif match_type == 'starts_with' and norm.startswith(pattern):
                return rule['transaction_type'] or 'expense', rule['category'], 'high', False
            elif match_type == 'contains' and pattern in norm:
                return rule['transaction_type'] or 'expense', rule['category'], 'high', False

    # Credit card payments (positive amounts that are payments)
    for pat in CREDIT_CARD_PAYMENT_PATTERNS:
        if re.search(pat, norm, re.IGNORECASE):
            return 'credit_card_payment', 'Credit Card Payment', 'high', False

    # Loan payments
    for pat in LOAN_PAYMENT_PATTERNS:
        if re.search(pat, norm, re.IGNORECASE):
            return 'loan_payment', 'Loan Payment', 'high', False

    # Transfers
    for pat in TRANSFER_PATTERNS:
        if re.search(pat, norm, re.IGNORECASE):
            return 'transfer', 'Transfer', 'high', False

    # Income (positive amounts)
    if amt > 0:
        for pat in INCOME_PATTERNS:
            if re.search(pat, norm, re.IGNORECASE):
                return 'income', 'Salary', 'high', False
        # Positive amount with no pattern = likely income but needs review
        return 'income', 'Income', 'medium', False

    # Refunds (negative amount flagged as refund)
    for pat in REFUND_PATTERNS:
        if re.search(pat, norm, re.IGNORECASE) and amt > 0:
            return 'refund', 'Refund', 'high', False

    # Expense categories
    if amt < 0:
        for category, patterns in EXPENSE_CATEGORIES.items():
            for pat in patterns:
                if re.search(pat, norm, re.IGNORECASE):
                    return 'expense', category, 'high', False

        # Matched as expense but no category found
        return 'expense', 'Other', 'medium', True

    # Truly unknown
    return 'unknown', 'Uncategorized', 'low', True


def should_exclude_from_spending(transaction_type: str) -> bool:
    """Returns True if transaction should be excluded from total spent"""
    return transaction_type in ['income', 'transfer', 'credit_card_payment', 'refund']


def generate_fingerprint(bank_source: str, transaction_date: str, amount: float, description: str) -> str:
    """Create a deduplication fingerprint"""
    import hashlib
    norm_desc = normalize_description(description)
    # Remove store numbers and location codes for better matching
    norm_desc = re.sub(r'#\d+', '', norm_desc).strip()
    raw = f"{bank_source}|{transaction_date}|{round(amount, 2)}|{norm_desc}"
    return hashlib.sha256(raw.encode()).hexdigest()
