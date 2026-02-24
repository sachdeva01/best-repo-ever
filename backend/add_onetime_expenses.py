"""
Add one-time and multi-year recurring expenses to the database.

This script adds:
1. Car replacement every 11 years
2. Long-term care insurance at $6K/year
3. Other major one-time expenses for retirement planning
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from database import DATABASE_URL
import sys

def add_onetime_expenses():
    """Add one-time and multi-year recurring expenses"""
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # First, add new expense categories if they don't exist
        print("Checking for Long-Term Care Insurance category...")

        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Long-Term Care Insurance'"))
        ltc_category = result.fetchone()

        if not ltc_category:
            print("Adding Long-Term Care Insurance category...")
            db.execute(text("""
                INSERT INTO expense_categories (name, description, annual_amount)
                VALUES ('Long-Term Care Insurance', 'Long-term care insurance premiums', 6000.0)
            """))
            db.commit()

            result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Long-Term Care Insurance'"))
            ltc_category = result.fetchone()

        ltc_category_id = ltc_category[0]
        print(f"Long-Term Care Insurance category ID: {ltc_category_id}")

        # Check for Major Home Repairs category
        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Major Home Repairs'"))
        home_repairs_category = result.fetchone()

        if not home_repairs_category:
            print("Adding Major Home Repairs category...")
            db.execute(text("""
                INSERT INTO expense_categories (name, description, annual_amount)
                VALUES ('Major Home Repairs', 'Roof, HVAC, major appliances every 10-15 years', 0.0)
            """))
            db.commit()

            result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Major Home Repairs'"))
            home_repairs_category = result.fetchone()

        home_repairs_id = home_repairs_category[0]
        print(f"Major Home Repairs category ID: {home_repairs_id}")

        # Check for Computer/Electronics Replacement category
        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Computer/Electronics'"))
        electronics_category = result.fetchone()

        if not electronics_category:
            print("Adding Computer/Electronics category...")
            db.execute(text("""
                INSERT INTO expense_categories (name, description, annual_amount)
                VALUES ('Computer/Electronics', 'Computer, phone, and electronics replacement', 0.0)
            """))
            db.commit()

            result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Computer/Electronics'"))
            electronics_category = result.fetchone()

        electronics_id = electronics_category[0]
        print(f"Computer/Electronics category ID: {electronics_id}")

        # Get Car Replacement category ID
        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Car Replacement'"))
        car_category = result.fetchone()
        car_category_id = car_category[0] if car_category else 21  # Default to 21 if not found
        print(f"Car Replacement category ID: {car_category_id}")

        # Check if car replacement expense already exists
        result = db.execute(text("""
            SELECT id, is_recurring, recurrence_period, recurrence_interval_years
            FROM expenses
            WHERE category_id = :cat_id
            AND is_recurring = 1
            AND recurrence_period = 'MULTI_YEAR'
        """), {"cat_id": car_category_id})
        existing_car = result.fetchone()

        if existing_car:
            print(f"Updating existing car replacement expense (ID: {existing_car[0]}) to 11-year interval...")
            db.execute(text("""
                UPDATE expenses
                SET amount = 60000.0,
                    description = 'Car replacement every 11 years - average of $60K',
                    recurrence_interval_years = 11,
                    expense_type = 'RECURRING'
                WHERE id = :exp_id
            """), {"exp_id": existing_car[0]})
        else:
            print("Adding car replacement expense (every 11 years)...")
            # Use last purchase date or current date
            last_car_date = datetime.now() - timedelta(days=365*3)  # Assume last car was 3 years ago

            db.execute(text("""
                INSERT INTO expenses
                (category_id, amount, description, expense_date, is_recurring, recurrence_period, recurrence_interval_years, expense_type, created_at)
                VALUES
                (:cat_id, 60000.0, 'Car replacement every 11 years - average of $60K', :date, 1, 'MULTI_YEAR', 11, 'RECURRING', :created)
            """), {
                "cat_id": car_category_id,
                "date": last_car_date.isoformat(),
                "created": datetime.now().isoformat()
            })

        # Check if long-term care insurance expense exists
        result = db.execute(text("""
            SELECT id FROM expenses
            WHERE category_id = :cat_id
            AND is_recurring = 1
            AND recurrence_period = 'YEARLY'
        """), {"cat_id": ltc_category_id})
        existing_ltc = result.fetchone()

        if not existing_ltc:
            print("Adding long-term care insurance expense ($6K/year)...")
            db.execute(text("""
                INSERT INTO expenses
                (category_id, amount, description, expense_date, is_recurring, recurrence_period, expense_type, created_at)
                VALUES
                (:cat_id, 6000.0, 'Annual long-term care insurance premium', :date, 1, 'YEARLY', 'RECURRING', :created)
            """), {
                "cat_id": ltc_category_id,
                "date": datetime.now().isoformat(),
                "created": datetime.now().isoformat()
            })
        else:
            print(f"Long-term care insurance expense already exists (ID: {existing_ltc[0]})")

        # Add major home repair expense (every 15 years)
        result = db.execute(text("""
            SELECT id FROM expenses
            WHERE category_id = :cat_id
            AND is_recurring = 1
            AND recurrence_period = 'MULTI_YEAR'
        """), {"cat_id": home_repairs_id})
        existing_repairs = result.fetchone()

        if not existing_repairs:
            print("Adding major home repairs expense (every 15 years)...")
            last_repair_date = datetime.now() - timedelta(days=365*7)  # Assume last major repair was 7 years ago

            db.execute(text("""
                INSERT INTO expenses
                (category_id, amount, description, expense_date, is_recurring, recurrence_period, recurrence_interval_years, expense_type, created_at)
                VALUES
                (:cat_id, 25000.0, 'Major home repairs (roof, HVAC, etc.) every 15 years', :date, 1, 'MULTI_YEAR', 15, 'RECURRING', :created)
            """), {
                "cat_id": home_repairs_id,
                "date": last_repair_date.isoformat(),
                "created": datetime.now().isoformat()
            })
        else:
            print(f"Major home repairs expense already exists (ID: {existing_repairs[0]})")

        # Add computer/electronics replacement (every 4 years)
        result = db.execute(text("""
            SELECT id FROM expenses
            WHERE category_id = :cat_id
            AND is_recurring = 1
            AND recurrence_period = 'MULTI_YEAR'
        """), {"cat_id": electronics_id})
        existing_electronics = result.fetchone()

        if not existing_electronics:
            print("Adding computer/electronics replacement expense (every 4 years)...")
            last_electronics_date = datetime.now() - timedelta(days=365*2)  # Assume last purchase was 2 years ago

            db.execute(text("""
                INSERT INTO expenses
                (category_id, amount, description, expense_date, is_recurring, recurrence_period, recurrence_interval_years, expense_type, created_at)
                VALUES
                (:cat_id, 5000.0, 'Computer, phones, and electronics replacement every 4 years', :date, 1, 'MULTI_YEAR', 4, 'RECURRING', :created)
            """), {
                "cat_id": electronics_id,
                "date": last_electronics_date.isoformat(),
                "created": datetime.now().isoformat()
            })
        else:
            print(f"Computer/electronics expense already exists (ID: {existing_electronics[0]})")

        # Commit all changes
        db.commit()

        # Display summary of all recurring multi-year expenses
        print("\n" + "="*70)
        print("SUMMARY: All Recurring Multi-Year Expenses")
        print("="*70)

        result = db.execute(text("""
            SELECT
                e.id,
                c.name as category,
                e.amount,
                e.description,
                e.recurrence_interval_years,
                e.expense_date,
                ROUND(e.amount / CAST(e.recurrence_interval_years AS FLOAT), 2) as annualized_amount
            FROM expenses e
            JOIN expense_categories c ON e.category_id = c.id
            WHERE e.is_recurring = 1 AND e.recurrence_period = 'MULTI_YEAR'
            ORDER BY e.recurrence_interval_years, c.name
        """))

        multi_year_expenses = result.fetchall()
        total_annualized = 0.0

        for exp in multi_year_expenses:
            exp_id, category, amount, description, interval, date, annualized = exp
            total_annualized += annualized
            print(f"\n{category}")
            print(f"  Amount: ${amount:,.2f}")
            print(f"  Frequency: Every {interval} years")
            print(f"  Annualized: ${annualized:,.2f}/year")
            print(f"  Description: {description}")

        print(f"\n{'='*70}")
        print(f"TOTAL ANNUALIZED MULTI-YEAR EXPENSES: ${total_annualized:,.2f}/year")
        print(f"{'='*70}")

        # Display total annual expenses including yearly recurring
        print("\n" + "="*70)
        print("TOTAL ANNUAL EXPENSES (Including Yearly Recurring)")
        print("="*70)

        result = db.execute(text("""
            SELECT
                SUM(
                    CASE
                        WHEN e.recurrence_period = 'MONTHLY' THEN e.amount * 12
                        WHEN e.recurrence_period = 'QUARTERLY' THEN e.amount * 4
                        WHEN e.recurrence_period = 'YEARLY' THEN e.amount
                        WHEN e.recurrence_period = 'MULTI_YEAR' THEN e.amount / CAST(e.recurrence_interval_years AS FLOAT)
                        ELSE 0
                    END
                ) as total_annual
            FROM expenses e
            WHERE e.is_recurring = 1
        """))

        total_annual_result = result.fetchone()
        total_annual = total_annual_result[0] if total_annual_result and total_annual_result[0] else 0.0

        print(f"\nTotal Annual Recurring Expenses: ${total_annual:,.2f}")
        print(f"This amount will be used in retirement calculations")
        print("="*70)

        print("\n✓ Successfully added/updated one-time expenses!")
        print(f"\nNEXT STEP: The $225K base expense amount should now reflect ${total_annual:,.2f}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Adding one-time and multi-year recurring expenses...")
    print("="*70)
    add_onetime_expenses()
