"""
Migration script to add new expense tracking fields and categories
"""
from database import engine, SessionLocal
from models import Base, ExpenseCategory
from sqlalchemy import text

def migrate_database():
    """Add new columns to expenses table"""
    db = SessionLocal()

    try:
        # Add new columns to expenses table if they don't exist
        with engine.connect() as conn:
            # Check if columns exist
            result = conn.execute(text("PRAGMA table_info(expenses)"))
            columns = [row[1] for row in result]

            if 'recurrence_interval_years' not in columns:
                print("Adding recurrence_interval_years column...")
                conn.execute(text("ALTER TABLE expenses ADD COLUMN recurrence_interval_years INTEGER"))
                conn.commit()

            if 'expense_type' not in columns:
                print("Adding expense_type column...")
                conn.execute(text("ALTER TABLE expenses ADD COLUMN expense_type VARCHAR DEFAULT 'HOUSEHOLD'"))
                conn.commit()

        print("Database migration completed successfully!")

    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()


def add_detailed_expense_categories():
    """Add detailed household expense categories"""
    db = SessionLocal()

    detailed_categories = [
        # Housing
        {"name": "Mortgage/Rent", "description": "Monthly housing payment"},
        {"name": "Property Tax", "description": "Annual or semi-annual property taxes"},
        {"name": "Home Insurance", "description": "Homeowners or renters insurance"},
        {"name": "HOA Fees", "description": "Homeowners association fees"},
        {"name": "Home Maintenance", "description": "Repairs, upkeep, landscaping"},

        # Utilities
        {"name": "Electric", "description": "Electricity bill"},
        {"name": "Gas", "description": "Natural gas or propane"},
        {"name": "Water/Sewer", "description": "Water and sewer services"},
        {"name": "Trash/Recycling", "description": "Waste management"},
        {"name": "Internet/Cable", "description": "Internet and cable TV"},
        {"name": "Phone", "description": "Mobile and landline phones"},

        # Transportation
        {"name": "Car Payment", "description": "Auto loan or lease payment"},
        {"name": "Car Insurance", "description": "Auto insurance premiums"},
        {"name": "Gas/Fuel", "description": "Gasoline or charging costs"},
        {"name": "Car Maintenance", "description": "Oil changes, repairs, tires"},
        {"name": "Car Replacement", "description": "Periodic new/used car purchase"},
        {"name": "Public Transportation", "description": "Bus, train, subway fares"},

        # Health & Medical
        {"name": "Health Insurance", "description": "Medical insurance premiums"},
        {"name": "Medical Expenses", "description": "Doctor visits, prescriptions, co-pays"},
        {"name": "Dental", "description": "Dental care and insurance"},
        {"name": "Vision", "description": "Eye exams, glasses, contacts"},
        {"name": "Life Insurance", "description": "Life insurance premiums"},

        # Food & Dining
        {"name": "Groceries", "description": "Food and household supplies"},
        {"name": "Dining Out", "description": "Restaurants and takeout"},

        # Personal & Entertainment
        {"name": "Clothing", "description": "Clothes and shoes"},
        {"name": "Personal Care", "description": "Haircuts, toiletries, gym"},
        {"name": "Entertainment", "description": "Movies, concerts, hobbies"},
        {"name": "Subscriptions", "description": "Streaming services, memberships"},
        {"name": "Travel/Vacation", "description": "Trips and vacations"},

        # Financial
        {"name": "Credit Card Payments", "description": "Credit card bills"},
        {"name": "Student Loans", "description": "Education loan payments"},
        {"name": "Other Loans", "description": "Personal or other loan payments"},

        # Miscellaneous
        {"name": "Gifts/Charity", "description": "Gifts and charitable donations"},
        {"name": "Pet Care", "description": "Pet food, vet, supplies"},
        {"name": "Child Care", "description": "Daycare, babysitting"},
        {"name": "Education", "description": "Tuition, books, supplies"},
        {"name": "Other", "description": "Miscellaneous expenses"}
    ]

    try:
        for cat_data in detailed_categories:
            # Check if category already exists
            existing = db.query(ExpenseCategory).filter(
                ExpenseCategory.name == cat_data["name"]
            ).first()

            if not existing:
                category = ExpenseCategory(**cat_data)
                db.add(category)
                print(f"Added category: {cat_data['name']}")

        db.commit()
        print(f"\nAdded {len(detailed_categories)} detailed expense categories!")

    except Exception as e:
        print(f"Error adding categories: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting expense tracking migration...\n")
    migrate_database()
    print()
    add_detailed_expense_categories()
    print("\nMigration complete!")
