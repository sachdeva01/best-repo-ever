from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import Expense, ExpenseCategory
from schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    CategoryResponse, CategoryUpdate
)

router = APIRouter()


# Expense Category Endpoints
@router.get("/expense-categories", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all expense categories"""
    categories = db.query(ExpenseCategory).all()
    return categories


@router.get("/expenses/total-annual")
async def get_total_annual_expenses(db: Session = Depends(get_db)):
    """
    Calculate total annual expenses from all expense records.
    Only includes recurring expenses, annualized based on their frequency.
    """
    expenses = db.query(Expense).all()
    total_annual = 0.0

    recurring_breakdown = {
        "MONTHLY": 0.0,
        "QUARTERLY": 0.0,
        "YEARLY": 0.0,
        "MULTI_YEAR": 0.0
    }

    for expense in expenses:
        if expense.is_recurring:
            if expense.recurrence_period == "MONTHLY":
                amount = expense.amount * 12
                total_annual += amount
                recurring_breakdown["MONTHLY"] += amount
            elif expense.recurrence_period == "QUARTERLY":
                amount = expense.amount * 4
                total_annual += amount
                recurring_breakdown["QUARTERLY"] += amount
            elif expense.recurrence_period == "YEARLY":
                total_annual += expense.amount
                recurring_breakdown["YEARLY"] += expense.amount
            elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
                amount = expense.amount / expense.recurrence_interval_years
                total_annual += amount
                recurring_breakdown["MULTI_YEAR"] += amount

    return {
        "total_annual_expenses": round(total_annual, 2),
        "breakdown_by_frequency": {k: round(v, 2) for k, v in recurring_breakdown.items()},
        "note": "Only includes recurring expenses. One-time expenses are excluded from annual budget."
    }


@router.put("/expense-categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update an expense category's annual amount"""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.annual_amount = category_update.annual_amount
    db.commit()
    db.refresh(category)
    return category


# Expense Endpoints
@router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    """Create a new expense"""
    # Verify category exists
    category = db.query(ExpenseCategory).filter(
        ExpenseCategory.id == expense.category_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db_expense = Expense(
        category_id=expense.category_id,
        amount=expense.amount,
        description=expense.description,
        expense_date=expense.expense_date,
        is_recurring=1 if expense.is_recurring else 0,
        recurrence_period=expense.recurrence_period,
        recurrence_interval_years=getattr(expense, 'recurrence_interval_years', None),
        expense_type=getattr(expense, 'expense_type', 'HOUSEHOLD')
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("/expenses/summary/by-category")
async def get_expense_summary(db: Session = Depends(get_db)):
    """Get expense summary by category"""
    categories = db.query(ExpenseCategory).all()

    summary = []
    total_annual = 0.0

    for category in categories:
        # For simplified tracking, use the annual_amount from category
        summary.append({
            "category_id": category.id,
            "category_name": category.name,
            "annual_amount": category.annual_amount
        })
        total_annual += category.annual_amount

    return {
        "categories": summary,
        "total_annual_expenses": total_annual
    }


@router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    category_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get all expenses with optional filters"""
    query = db.query(Expense)

    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    expenses = query.order_by(Expense.expense_date.desc()).all()
    return expenses


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Update only provided fields
    if expense_update.amount is not None:
        expense.amount = expense_update.amount
    if expense_update.description is not None:
        expense.description = expense_update.description
    if expense_update.category_id is not None:
        # Verify new category exists
        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == expense_update.category_id
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        expense.category_id = expense_update.category_id
    if expense_update.expense_date is not None:
        expense.expense_date = expense_update.expense_date
    if expense_update.is_recurring is not None:
        expense.is_recurring = 1 if expense_update.is_recurring else 0
    if expense_update.recurrence_period is not None:
        expense.recurrence_period = expense_update.recurrence_period
    if expense_update.recurrence_interval_years is not None:
        expense.recurrence_interval_years = expense_update.recurrence_interval_years
    if expense_update.expense_type is not None:
        expense.expense_type = expense_update.expense_type

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Delete an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}


@router.get("/expenses/detailed/summary")
async def get_detailed_expense_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get detailed expense summary with breakdown by category and type"""
    query = db.query(Expense)

    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    expenses = query.all()
    categories = db.query(ExpenseCategory).all()

    # Organize by category
    category_breakdown = {}
    total_by_type = {"HOUSEHOLD": 0.0, "ONE_TIME": 0.0, "RECURRING": 0.0}

    for category in categories:
        category_expenses = [e for e in expenses if e.category_id == category.id]
        category_total = sum(e.amount for e in category_expenses)

        if category_total > 0 or category.annual_amount > 0:
            expense_items = []
            for exp in category_expenses:
                expense_items.append({
                    "id": exp.id,
                    "amount": exp.amount,
                    "description": exp.description,
                    "date": exp.expense_date.isoformat(),
                    "is_recurring": bool(exp.is_recurring),
                    "recurrence_period": exp.recurrence_period,
                    "recurrence_interval_years": exp.recurrence_interval_years,
                    "expense_type": exp.expense_type
                })

                # Track by type
                exp_type = exp.expense_type or "HOUSEHOLD"
                total_by_type[exp_type] += exp.amount

            category_breakdown[category.name] = {
                "category_id": category.id,
                "total": category_total,
                "count": len(category_expenses),
                "annual_budget": category.annual_amount,
                "expenses": expense_items
            }

    return {
        "category_breakdown": category_breakdown,
        "total_by_type": total_by_type,
        "grand_total": sum(total_by_type.values()),
        "date_range": {
            "start": start_date.isoformat() if start_date else None,
            "end": end_date.isoformat() if end_date else None
        }
    }


@router.get("/expenses/analytics/monthly")
async def get_monthly_expense_analytics(
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get monthly expense analytics for a specific year"""
    from sqlalchemy import extract, func

    if not year:
        year = datetime.now().year

    # Query expenses for the specified year
    expenses = db.query(Expense).filter(
        extract('year', Expense.expense_date) == year
    ).all()

    # Organize by month
    monthly_totals = {month: 0.0 for month in range(1, 13)}
    monthly_by_category = {month: {} for month in range(1, 13)}

    for expense in expenses:
        month = expense.expense_date.month
        monthly_totals[month] += expense.amount

        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == expense.category_id
        ).first()

        if category:
            if category.name not in monthly_by_category[month]:
                monthly_by_category[month][category.name] = 0.0
            monthly_by_category[month][category.name] += expense.amount

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    monthly_data = []
    for month in range(1, 13):
        monthly_data.append({
            "month": month,
            "month_name": month_names[month - 1],
            "total": round(monthly_totals[month], 2),
            "by_category": {k: round(v, 2) for k, v in monthly_by_category[month].items()}
        })

    return {
        "year": year,
        "monthly_data": monthly_data,
        "annual_total": round(sum(monthly_totals.values()), 2)
    }


@router.get("/expenses/recurring")
async def get_recurring_expenses(db: Session = Depends(get_db)):
    """Get all recurring expenses with annualized projections"""
    recurring_expenses = db.query(Expense).filter(Expense.is_recurring == 1).all()

    recurring_list = []
    total_annual_recurring = 0.0

    for expense in recurring_expenses:
        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == expense.category_id
        ).first()

        # Calculate annualized amount
        annual_amount = 0.0
        if expense.recurrence_period == "MONTHLY":
            annual_amount = expense.amount * 12
        elif expense.recurrence_period == "QUARTERLY":
            annual_amount = expense.amount * 4
        elif expense.recurrence_period == "YEARLY":
            annual_amount = expense.amount
        elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
            annual_amount = expense.amount / expense.recurrence_interval_years

        total_annual_recurring += annual_amount

        recurring_list.append({
            "id": expense.id,
            "category_name": category.name if category else "Unknown",
            "amount": round(expense.amount, 2),
            "description": expense.description,
            "recurrence_period": expense.recurrence_period,
            "recurrence_interval_years": expense.recurrence_interval_years,
            "annual_amount": round(annual_amount, 2),
            "next_date": expense.expense_date.isoformat()
        })

    return {
        "recurring_expenses": recurring_list,
        "total_annual_recurring": round(total_annual_recurring, 2)
    }


@router.get("/expenses/one-time")
async def get_one_time_expenses(
    upcoming_years: int = 5,
    db: Session = Depends(get_db)
):
    """Get one-time and multi-year recurring expenses for planning"""
    from dateutil.relativedelta import relativedelta

    # Get one-time expenses
    one_time_expenses = db.query(Expense).filter(
        Expense.expense_type == "ONE_TIME"
    ).order_by(Expense.expense_date.desc()).all()

    # Get multi-year recurring expenses
    multi_year_expenses = db.query(Expense).filter(
        Expense.recurrence_period == "MULTI_YEAR"
    ).all()

    # Project future one-time expenses
    today = datetime.now()
    future_expenses = []

    for expense in multi_year_expenses:
        if expense.recurrence_interval_years:
            category = db.query(ExpenseCategory).filter(
                ExpenseCategory.id == expense.category_id
            ).first()

            # Project next occurrences
            last_date = expense.expense_date
            for i in range(1, upcoming_years + 1):
                next_date = last_date + relativedelta(years=expense.recurrence_interval_years * i)
                if next_date.year <= today.year + upcoming_years:
                    future_expenses.append({
                        "id": expense.id,
                        "category_name": category.name if category else "Unknown",
                        "description": expense.description,
                        "amount": round(expense.amount, 2),
                        "projected_date": next_date.isoformat(),
                        "years_from_now": (next_date.year - today.year),
                        "type": "recurring_multi_year"
                    })

    # Add historical one-time expenses
    historical = []
    for expense in one_time_expenses:
        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == expense.category_id
        ).first()

        historical.append({
            "id": expense.id,
            "category_name": category.name if category else "Unknown",
            "description": expense.description,
            "amount": round(expense.amount, 2),
            "date": expense.expense_date.isoformat(),
            "type": "one_time"
        })

    return {
        "historical_one_time": historical,
        "projected_future_expenses": sorted(future_expenses, key=lambda x: x["projected_date"]),
        "total_upcoming_5_years": round(sum(e["amount"] for e in future_expenses), 2)
    }


@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """Get a specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense
