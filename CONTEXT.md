
xspend — personal finance app





Stack: React/Vite frontend + FastAPI/SQLite backend



Location: ~/Desktop/financeai/



Domain: xspend.io



GitHub: github.com/dharani0804/XSPEND.io



DB: SQLite, backend port 8000, frontend port 5173



Test login: dharani@test.com / test123

What Was Built This Session

Parser Architecture (major work)





Universal parse_statement() router — file type → bank → parser



MIME detection, password-protected PDF detection



Smart error messages with bank-specific format hints



Filename-first bank detection (more reliable than text detection)

New Bank Parsers (pdf_parser_xy.py)





✅ Wells Fargo Credit (Bilt) — 14/14



✅ Wells Fargo Banking (checking) — 27/27



✅ Macy's/Citi — 8/8



✅ Discover — decoded custom font encoding (offset=29), 4/4



❌ Barclays — scanned PDF, needs OCR

New File Type Parsers (parser.py)





Universal CSV parser with dynamic column detection



Universal Excel parser with toll account detection



Toll XLSX parser (NTTA format) — parse_toll_xlsx()

Classifier Fixes





Fixed farmers → farmers.?ins (prevents Sprouts matching Insurance)



Added Ethiopian/international restaurant patterns



Added GMR airports → Travel



Added Paddle → Subscriptions



Fixed Costco Gas → Transport priority rule



Fixed BOND HAIR BAR → Personal Care



Fixed WMT PLUS → Subscriptions



Fixed DD *SPROUTS → Groceries



Fixed RAZ*IndiGo → Travel



All 3 test suites passing (57/57)

Bugs Fixed





'list' object has no attribute 'lower' — user_rules passing as bank param



'>=' not supported NoneType — confidence_override None check



UNIQUE constraint fingerprint — flush individually, skip duplicates gracefully



original_description KeyError — use .get() with fallback



Fingerprint collision for identical toll transactions — added ext_id to fingerprint



parse_excel duplicate function — removed old version



Bank detection priority — filename first, then text

UI Changes





Upload page copy updated — "Upload your bank statement or transaction file"



Smart error messages — bank-specific CSV download instructions



Timeout increased to 2 min with AbortController



Better error display for failed uploads

Credit Engine





credit_offsets table auto-created in database.py



Credit matching runs after every upload



17/17 Amex credits matched

Merchant Rules (user correction memory)





Fixed INSERT to include merchant_keyword and is_fixed columns



Fixed PATCH endpoint to auto-set transaction_type for Transfer/Payment



42 rules saved from user corrections



Rules apply on next upload automatically

Current Known Issues





Project tagging not reflected in Goals page — being investigated



WF Banking "Connection failed" — actually saves but frontend times out; transactions do import



Toll duplicates — fixed with ext_id in fingerprint, needs re-test after clear



Barclays — scanned PDF, show error message directing to CSV

Files Modified This Session





backend/parser.py — major rewrite, universal parsers, MIME detection



backend/pdf_parser_xy.py — WF credit, WF banking, Macy's/Citi, Discover parsers



backend/classifier.py — fingerprint fix, confidence_override fix



backend/main.py — PATCH fixes, user_rules fix, duplicate handling



backend/credit_engine.py — stable



backend/database.py — auto-create credit_offsets



frontend/src/pages/Upload.jsx — copy, timeout, error display



frontend/src/pages/Goals.jsx — spending impact, spending context

Next Steps





Fix project tagging → Goals page reflection



Test toll upload showing 116 (not 46)



Upload all statements (Chase, Amex, BofA, WF, Discover, Macy's, Tolls)



Multi-user auth testing



Deploy to Vercel + Render

