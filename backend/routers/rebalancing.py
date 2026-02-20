from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, Holding
from typing import List, Dict

router = APIRouter()

# Target allocation from Opus strategy
TARGET_ALLOCATION = {
    "Dividend Growth Stocks": 0.30,
    "High-Yield Bonds": 0.20,
    "REITs": 0.10,
    "Treasury/TIPS": 0.15,
    "Preferred Stock": 0.05,
    "Cash/Money Market": 0.08,
    "Growth Equities": 0.12
}

# Map asset types to target categories
ASSET_TYPE_MAPPING = {
    "Stock": "Dividend Growth Stocks",
    "Bond": "High-Yield Bonds",
    "ETF": "Growth Equities",  # Default, can be refined
    "Mutual Fund": "Growth Equities",
    "Cash": "Cash/Money Market",
    "Other": "Growth Equities"
}


def calculate_current_allocation(db: Session) -> Dict:
    """Calculate current portfolio allocation by asset category"""
    holdings = db.query(Holding).all()

    # Calculate total portfolio value
    total_value = 0.0
    category_values = {}

    for holding in holdings:
        holding_value = holding.quantity * holding.price_per_share
        total_value += holding_value

        # Map asset type to target category
        category = ASSET_TYPE_MAPPING.get(holding.asset_type, "Growth Equities")
        category_values[category] = category_values.get(category, 0.0) + holding_value

    # Calculate percentages
    current_allocation = {}
    for category in TARGET_ALLOCATION.keys():
        current_value = category_values.get(category, 0.0)
        current_percentage = (current_value / total_value) if total_value > 0 else 0.0
        current_allocation[category] = {
            "current_value": round(current_value, 2),
            "current_percentage": round(current_percentage, 4),
            "target_percentage": TARGET_ALLOCATION[category]
        }

    return {
        "total_portfolio_value": round(total_value, 2),
        "allocations": current_allocation
    }


def calculate_rebalancing_trades(db: Session) -> Dict:
    """Calculate specific trades needed to rebalance portfolio to target allocation"""
    accounts = db.query(BrokerageAccount).all()
    total_net_worth = sum(acc.current_balance for acc in accounts)

    current_alloc = calculate_current_allocation(db)
    trades = []

    for category, details in current_alloc["allocations"].items():
        current_value = details["current_value"]
        target_percentage = details["target_percentage"]
        target_value = total_net_worth * target_percentage

        difference = target_value - current_value
        difference_percentage = (difference / total_net_worth) if total_net_worth > 0 else 0.0

        if abs(difference) > (total_net_worth * 0.01):  # Only suggest if >1% difference
            action = "BUY" if difference > 0 else "SELL"
            trades.append({
                "category": category,
                "action": action,
                "amount": round(abs(difference), 2),
                "current_value": round(current_value, 2),
                "target_value": round(target_value, 2),
                "difference_percentage": round(difference_percentage * 100, 2),
                "priority": "High" if abs(difference_percentage) > 0.05 else "Medium" if abs(difference_percentage) > 0.02 else "Low"
            })

    # Sort by priority and absolute difference
    trades.sort(key=lambda x: (
        {"High": 0, "Medium": 1, "Low": 2}[x["priority"]],
        -x["amount"]
    ))

    return {
        "total_portfolio_value": round(total_net_worth, 2),
        "trades": trades,
        "summary": {
            "total_trades": len(trades),
            "total_buy_amount": round(sum(t["amount"] for t in trades if t["action"] == "BUY"), 2),
            "total_sell_amount": round(sum(t["amount"] for t in trades if t["action"] == "SELL"), 2),
            "estimated_trades_to_rebalance": len([t for t in trades if t["priority"] in ["High", "Medium"]])
        }
    }


def generate_specific_recommendations(db: Session) -> List[Dict]:
    """Generate specific, actionable buy/sell recommendations"""
    rebalancing = calculate_rebalancing_trades(db)
    recommendations = []

    # Recommendation templates based on category
    category_suggestions = {
        "Dividend Growth Stocks": {
            "buy": ["VYM (Vanguard High Dividend Yield ETF)", "SCHD (Schwab US Dividend Equity ETF)", "DGRO (iShares Core Dividend Growth ETF)"],
            "description": "Focus on dividend aristocrats and blue-chip stocks with consistent dividend growth"
        },
        "High-Yield Bonds": {
            "buy": ["HYG (iShares iBoxx High Yield Corporate Bond ETF)", "JNK (SPDR Bloomberg High Yield Bond ETF)", "USHY (iShares Broad USD High Yield Corporate Bond ETF)"],
            "description": "Investment-grade corporate bonds with higher yields; ladder maturities for stability"
        },
        "REITs": {
            "buy": ["VNQ (Vanguard Real Estate ETF)", "SCHH (Schwab US REIT ETF)", "IYR (iShares U.S. Real Estate ETF)"],
            "description": "Diversified REIT exposure for income and inflation protection"
        },
        "Treasury/TIPS": {
            "buy": ["TIP (iShares TIPS Bond ETF)", "SCHP (Schwab U.S. TIPS ETF)", "VTIP (Vanguard Short-Term Inflation-Protected Securities ETF)"],
            "description": "Treasury Inflation-Protected Securities for safe, inflation-adjusted income"
        },
        "Preferred Stock": {
            "buy": ["PFF (iShares Preferred and Income Securities ETF)", "PGX (Invesco Preferred ETF)", "PFFD (Global X U.S. Preferred ETF)"],
            "description": "Higher yields than common stocks with less volatility"
        },
        "Cash/Money Market": {
            "buy": ["High-yield savings account", "Money market fund", "Short-term Treasury bills"],
            "description": "Maintain 2-year expense buffer (~$450-500K) for market downturns"
        },
        "Growth Equities": {
            "buy": ["VTI (Vanguard Total Stock Market ETF)", "VOO (Vanguard S&P 500 ETF)", "QQQ (Invesco QQQ Trust)"],
            "description": "Long-term appreciation potential; rebalance into income assets later"
        }
    }

    for trade in rebalancing["trades"]:
        if trade["priority"] in ["High", "Medium"]:
            category = trade["category"]
            suggestions = category_suggestions.get(category, {})

            recommendation = {
                "action": trade["action"],
                "category": category,
                "amount": trade["amount"],
                "priority": trade["priority"],
                "reason": f"Portfolio is {'under' if trade['action'] == 'BUY' else 'over'}weighted in {category}. "
                         f"Current: {trade['current_value']:,.0f} ({trade['current_value']/rebalancing['total_portfolio_value']*100:.1f}%), "
                         f"Target: {trade['target_value']:,.0f} ({trade['target_value']/rebalancing['total_portfolio_value']*100:.1f}%)",
                "suggestions": suggestions.get("buy" if trade["action"] == "BUY" else "sell", []),
                "description": suggestions.get("description", ""),
                "expected_yield_improvement": calculate_yield_improvement(trade, category) if trade["action"] == "BUY" else 0
            }
            recommendations.append(recommendation)

    return recommendations


def calculate_yield_improvement(trade: Dict, category: str) -> float:
    """Calculate expected yield improvement from this trade"""
    # Expected yields by category
    yields = {
        "Dividend Growth Stocks": 0.025,
        "High-Yield Bonds": 0.055,
        "REITs": 0.045,
        "Treasury/TIPS": 0.040,
        "Preferred Stock": 0.060,
        "Cash/Money Market": 0.040,
        "Growth Equities": 0.010
    }

    expected_yield = yields.get(category, 0.03)
    annual_income_increase = trade["amount"] * expected_yield
    return round(annual_income_increase, 2)


@router.get("/rebalancing/analysis")
async def get_rebalancing_analysis(db: Session = Depends(get_db)):
    """Get complete rebalancing analysis"""
    current_alloc = calculate_current_allocation(db)
    rebalancing_trades = calculate_rebalancing_trades(db)

    # Calculate alignment score (0-100)
    total_deviation = sum(
        abs(details["current_percentage"] - details["target_percentage"])
        for details in current_alloc["allocations"].values()
    )
    alignment_score = max(0, 100 - (total_deviation * 100))

    return {
        "current_allocation": current_alloc,
        "rebalancing_trades": rebalancing_trades,
        "alignment_score": round(alignment_score, 1),
        "status": "Well Aligned" if alignment_score >= 90 else "Moderate Drift" if alignment_score >= 70 else "Significant Drift",
        "next_rebalance_recommended": alignment_score < 85
    }


@router.get("/rebalancing/recommendations")
async def get_portfolio_recommendations(db: Session = Depends(get_db)):
    """Get specific, actionable portfolio recommendations"""
    recommendations = generate_specific_recommendations(db)

    # Calculate total expected income improvement
    total_income_improvement = sum(r.get("expected_yield_improvement", 0) for r in recommendations if r["action"] == "BUY")

    return {
        "recommendations": recommendations,
        "summary": {
            "total_recommendations": len(recommendations),
            "high_priority": len([r for r in recommendations if r["priority"] == "High"]),
            "medium_priority": len([r for r in recommendations if r["priority"] == "Medium"]),
            "expected_annual_income_increase": round(total_income_improvement, 2)
        }
    }
