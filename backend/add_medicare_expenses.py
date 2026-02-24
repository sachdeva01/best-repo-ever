"""
Add Medicare insurance costs and document age 65 expense reduction.

This script:
1. Updates pre-Medicare health insurance description
2. Adds Medicare supplemental insurance (age 65+)
3. Documents mortgage principal drop at age 65
4. Shows expense breakdown by age ranges
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from database import DATABASE_URL

def add_medicare_expenses():
    """Add Medicare expenses and document age-based expense changes"""
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("="*70)
        print("UPDATING HEALTH INSURANCE FOR MEDICARE TRANSITION")
        print("="*70)

        # Update existing health insurance expense to clarify it's pre-Medicare
        print("\n1. Updating pre-Medicare health insurance...")
        db.execute(text("""
            UPDATE expenses
            SET description = 'Pre-Medicare health insurance (until age 65) - $26K/year',
                expense_type = 'RECURRING'
            WHERE category_id = 1 AND is_recurring = 1
        """))
        db.commit()
        print("   ✓ Updated health insurance description")

        # Add Medicare Supplemental Insurance category
        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Medicare Supplemental'"))
        medicare_category = result.fetchone()

        if not medicare_category:
            print("\n2. Adding Medicare Supplemental Insurance category...")
            db.execute(text("""
                INSERT INTO expense_categories (name, description, annual_amount)
                VALUES ('Medicare Supplemental', 'Medicare Part B, D, and Medigap/Advantage (age 65+)', 5000.0)
            """))
            db.commit()

            result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Medicare Supplemental'"))
            medicare_category = result.fetchone()

        medicare_category_id = medicare_category[0]
        print(f"   ✓ Medicare Supplemental category ID: {medicare_category_id}")

        # Check if Medicare expense already exists
        result = db.execute(text("""
            SELECT id FROM expenses
            WHERE category_id = :cat_id
            AND is_recurring = 1
        """), {"cat_id": medicare_category_id})
        existing_medicare = result.fetchone()

        if not existing_medicare:
            print("\n3. Adding Medicare supplemental insurance expense...")
            db.execute(text("""
                INSERT INTO expenses
                (category_id, amount, description, expense_date, is_recurring, recurrence_period, expense_type, created_at)
                VALUES
                (:cat_id, 5000.0, 'Medicare Part B ($174/mo), Part D ($50/mo), Medigap Plan G ($200/mo) - starts age 65', :date, 1, 'YEARLY', 'RECURRING', :created)
            """), {
                "cat_id": medicare_category_id,
                "date": datetime.now().isoformat(),
                "created": datetime.now().isoformat()
            })
            db.commit()
            print("   ✓ Medicare supplemental insurance added ($5,000/year)")
        else:
            print(f"\n3. Medicare supplemental insurance already exists (ID: {existing_medicare[0]})")

        # Add note about mortgage reduction at age 65
        result = db.execute(text("SELECT id FROM expense_categories WHERE name = 'Mortgage Reduction Note'"))
        note_category = result.fetchone()

        if not note_category:
            print("\n4. Adding Mortgage Reduction documentation...")
            db.execute(text("""
                INSERT INTO expense_categories
                (name, description, annual_amount)
                VALUES
                ('Mortgage Reduction Note',
                 'At age 65: Mortgage principal portion drops (saves ~$30K/year)',
                 0.0)
            """))
            db.commit()
            print("   ✓ Mortgage reduction note added")
        else:
            print("\n4. Mortgage reduction note already exists")

        # Calculate and display expense breakdown by age
        print("\n" + "="*70)
        print("EXPENSE BREAKDOWN BY AGE")
        print("="*70)

        # Current total (ages 51-64)
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
        current_total = result.fetchone()[0]

        # Get health insurance amount
        result = db.execute(text("""
            SELECT amount FROM expenses WHERE category_id = 1 AND is_recurring = 1
        """))
        health_insurance = result.fetchone()[0]

        # Get Medicare amount
        result = db.execute(text("""
            SELECT amount FROM expenses WHERE category_id = :cat_id AND is_recurring = 1
        """), {"cat_id": medicare_category_id})
        medicare_result = result.fetchone()
        medicare_insurance = medicare_result[0] if medicare_result else 5000.0

        # Calculate expenses at different ages
        age_51_64 = current_total - medicare_insurance  # Don't count Medicare yet
        age_65 = age_51_64 - health_insurance + medicare_insurance  # Switch to Medicare
        age_66_plus = age_65 - 30000  # Drop mortgage principal

        print(f"\n📊 Ages 51-64 (Pre-Medicare, with mortgage):")
        print(f"   Total Annual Expenses: ${age_51_64:,.2f}")
        print(f"   - Includes: $26,000 health insurance")
        print(f"   - Includes: Mortgage payment (principal + interest)")

        print(f"\n📊 Age 65 (Medicare starts, mortgage still active):")
        print(f"   Total Annual Expenses: ${age_65:,.2f}")
        print(f"   - Remove: $26,000 pre-Medicare health insurance")
        print(f"   - Add: ${medicare_insurance:,.2f} Medicare supplemental")
        print(f"   - Savings from insurance switch: ${health_insurance - medicare_insurance:,.2f}")
        print(f"   - Still includes: Full mortgage payment")

        print(f"\n📊 Age 66+ (Medicare + mortgage paid off):")
        print(f"   Total Annual Expenses: ${age_66_plus:,.2f}")
        print(f"   - Remove: ~$30,000 mortgage principal payment")
        print(f"   - Keep: Mortgage interest (if any), property tax, insurance")
        print(f"   - Total savings from age 51-64: ${age_51_64 - age_66_plus:,.2f}")

        # Display detailed breakdown
        print("\n" + "="*70)
        print("DETAILED EXPENSE SUMMARY")
        print("="*70)

        result = db.execute(text("""
            SELECT
                c.name as category,
                e.amount,
                e.recurrence_period,
                e.recurrence_interval_years,
                ROUND(CASE
                    WHEN e.recurrence_period = 'MONTHLY' THEN e.amount * 12
                    WHEN e.recurrence_period = 'QUARTERLY' THEN e.amount * 4
                    WHEN e.recurrence_period = 'YEARLY' THEN e.amount
                    WHEN e.recurrence_period = 'MULTI_YEAR' THEN e.amount / CAST(e.recurrence_interval_years AS FLOAT)
                    ELSE 0
                END, 2) as annualized,
                e.description
            FROM expenses e
            JOIN expense_categories c ON e.category_id = c.id
            WHERE e.is_recurring = 1
            ORDER BY annualized DESC
        """))

        expenses = result.fetchall()

        print("\n" + f"{'Category':<30} {'Frequency':<15} {'Annual':<12} {'Description':<40}")
        print("-" * 105)

        for exp in expenses:
            category, amount, period, interval_years, annualized, description = exp

            if period == 'MONTHLY':
                freq = "Monthly"
            elif period == 'QUARTERLY':
                freq = "Quarterly"
            elif period == 'YEARLY':
                freq = "Yearly"
            elif period == 'MULTI_YEAR':
                freq = f"Every {interval_years}y"
            else:
                freq = "Unknown"

            desc = (description[:37] + "...") if description and len(description) > 40 else (description or "")
            print(f"{category:<30} {freq:<15} ${annualized:>10,.2f} {desc:<40}")

        print("-" * 105)
        print(f"{'TOTAL (Ages 51-64)':<30} {'':<15} ${age_51_64:>10,.2f}")
        print(f"{'TOTAL (Age 65)':<30} {'':<15} ${age_65:>10,.2f} {'(Medicare starts)':<40}")
        print(f"{'TOTAL (Age 66+)':<30} {'':<15} ${age_66_plus:>10,.2f} {'(+ mortgage paid off)':<40}")

        print("\n" + "="*70)
        print("✓ Medicare expenses configured successfully!")
        print("="*70)

        print("\n📝 NOTES:")
        print("   - Pre-Medicare health insurance: $26,000/year (ages 51-64)")
        print("   - Medicare supplemental: $5,000/year (age 65+)")
        print("   - Mortgage principal drop: $30,000 savings at age 66")
        print("   - These changes are built into retirement scenario calculations")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_medicare_expenses()
