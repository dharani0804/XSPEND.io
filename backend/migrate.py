import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "financeai.db")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create projects table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'custom',
        target_amount REAL,
        target_date TEXT,
        is_archived INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )
""")
print("✅ projects table ready")

# Add project_id to transactions if not exists
cols = [row[1] for row in cursor.execute("PRAGMA table_info(transactions)").fetchall()]
if "project_id" not in cols:
    cursor.execute("ALTER TABLE transactions ADD COLUMN project_id INTEGER REFERENCES projects(id)")
    print("✅ project_id added to transactions")
else:
    print("⏭️  project_id already exists")

# Drop old goals table if it exists (replaced by projects)
cursor.execute("DROP TABLE IF EXISTS goals")
print("✅ old goals table removed")

conn.commit()
conn.close()
print("\n🎉 Migration complete!")

def migrate_fixed_expenses():
    import sqlite3, os
    DB_PATH = os.path.join(os.path.dirname(__file__), "financeai.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cols = [row[1] for row in cursor.execute("PRAGMA table_info(transactions)").fetchall()]

    if "is_fixed" not in cols:
        cursor.execute("ALTER TABLE transactions ADD COLUMN is_fixed INTEGER DEFAULT 0")
        print("✅ is_fixed added to transactions")
    else:
        print("⏭️  is_fixed already exists")

    if "fixed_confidence" not in cols:
        cursor.execute("ALTER TABLE transactions ADD COLUMN fixed_confidence REAL DEFAULT 0.0")
        print("✅ fixed_confidence added to transactions")
    else:
        print("⏭️  fixed_confidence already exists")

    if "fixed_source" not in cols:
        cursor.execute("ALTER TABLE transactions ADD COLUMN fixed_source TEXT DEFAULT 'auto'")
        print("✅ fixed_source added to transactions")
    else:
        print("⏭️  fixed_source already exists")

    if "fixed_suggestion_dismissed" not in cols:
        cursor.execute("ALTER TABLE transactions ADD COLUMN fixed_suggestion_dismissed INTEGER DEFAULT 0")
        print("✅ fixed_suggestion_dismissed added to transactions")
    else:
        print("⏭️  fixed_suggestion_dismissed already exists")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS merchant_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant_keyword TEXT NOT NULL,
            is_fixed INTEGER NOT NULL,
            user_confirmed INTEGER DEFAULT 0,
            confidence REAL DEFAULT 0.0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    print("✅ merchant_rules table ready")

    conn.commit()
    conn.close()
    print("\n🎉 Fixed expenses migration complete!")

migrate_fixed_expenses()
