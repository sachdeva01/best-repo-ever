"""
Migration script to split current_balance into investments and cash fields
"""
from sqlalchemy import create_engine, Column, Float, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio_tracker.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

def migrate():
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("PRAGMA table_info(brokerage_accounts)"))
        columns = [row[1] for row in result]

        if 'investments' not in columns:
            print("Adding 'investments' column...")
            conn.execute(text("ALTER TABLE brokerage_accounts ADD COLUMN investments REAL DEFAULT 0.0"))
            conn.commit()

        if 'cash' not in columns:
            print("Adding 'cash' column...")
            conn.execute(text("ALTER TABLE brokerage_accounts ADD COLUMN cash REAL DEFAULT 0.0"))
            conn.commit()

        # Migrate existing data: move current_balance to investments
        print("Migrating existing data...")
        conn.execute(text("""
            UPDATE brokerage_accounts
            SET investments = current_balance,
                cash = 0.0
            WHERE investments = 0.0 AND cash = 0.0
        """))
        conn.commit()

        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
