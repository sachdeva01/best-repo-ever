"""Add tax rate columns to retirement_config table"""
from database import engine, SessionLocal
from sqlalchemy import text

def add_tax_columns():
    with engine.connect() as conn:
        # Add qualified_dividend_tax_rate column
        try:
            conn.execute(text("""
                ALTER TABLE retirement_config
                ADD COLUMN qualified_dividend_tax_rate REAL DEFAULT 0.15
            """))
            conn.commit()
            print("Added qualified_dividend_tax_rate column")
        except Exception as e:
            print(f"Column qualified_dividend_tax_rate may already exist: {e}")

        # Add ordinary_income_tax_rate column
        try:
            conn.execute(text("""
                ALTER TABLE retirement_config
                ADD COLUMN ordinary_income_tax_rate REAL DEFAULT 0.30
            """))
            conn.commit()
            print("Added ordinary_income_tax_rate column")
        except Exception as e:
            print(f"Column ordinary_income_tax_rate may already exist: {e}")

    print("Tax columns migration complete!")

if __name__ == "__main__":
    add_tax_columns()
