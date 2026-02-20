"""Database initialization script

Creates tables and seeds initial data including:
- 5 expense categories
- Default retirement config
"""
from database import engine, Base, SessionLocal
from models import ExpenseCategory, RetirementConfig


def init_database():
    """Initialize database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")


def seed_expense_categories():
    """Seed the 5 expense categories"""
    db = SessionLocal()

    try:
        # Check if categories already exist
        existing_count = db.query(ExpenseCategory).count()
        if existing_count > 0:
            print(f"✓ Expense categories already exist ({existing_count} categories)")
            return

        categories = [
            {"name": "Health Insurance", "description": "Health insurance premiums and medical expenses", "annual_amount": 0.0},
            {"name": "Mortgage", "description": "Mortgage or rent payments", "annual_amount": 0.0},
            {"name": "Utilities and Cash Expenses", "description": "Utilities, groceries, and day-to-day cash expenses", "annual_amount": 0.0},
            {"name": "Credit Cards", "description": "Credit card payments and other debt", "annual_amount": 0.0},
            {"name": "Other Miscellaneous", "description": "Other miscellaneous expenses", "annual_amount": 0.0},
        ]

        print("Seeding expense categories...")
        for cat_data in categories:
            category = ExpenseCategory(**cat_data)
            db.add(category)

        db.commit()
        print(f"✓ Created {len(categories)} expense categories")

    except Exception as e:
        print(f"✗ Error seeding expense categories: {e}")
        db.rollback()
    finally:
        db.close()


def seed_retirement_config():
    """Seed default retirement configuration"""
    db = SessionLocal()

    try:
        # Check if config already exists
        existing = db.query(RetirementConfig).first()
        if existing:
            print("✓ Retirement config already exists")
            return

        config = RetirementConfig(
            current_age=51,
            withdrawal_start_age=55,
            social_security_start_age=67,
            target_age=90,
            target_portfolio_value=4_250_000.0,
            inflation_rate=0.03,
            expected_dividend_yield=0.03,
            estimated_social_security_monthly=3000.0
        )

        db.add(config)
        db.commit()
        print("✓ Created default retirement configuration")

    except Exception as e:
        print(f"✗ Error seeding retirement config: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Portfolio Tracker - Database Initialization")
    print("=" * 60)

    init_database()
    seed_expense_categories()
    seed_retirement_config()

    print("=" * 60)
    print("✓ Database initialization complete!")
    print("=" * 60)
