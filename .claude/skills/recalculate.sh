#!/bin/bash

# Recalculate Skill
# Refreshes all portfolio and retirement calculations

set -e

API_URL="http://localhost:8000"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "======================================================================="
echo "PORTFOLIO RECALCULATION - $TIMESTAMP"
echo "======================================================================="

# 1. Calculate Annual Expenses
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STEP 1: Calculate Annual Expenses"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Calculating total annual expenses..."

expense_response=$(curl -s "$API_URL/api/expenses/total-annual")
if [ $? -eq 0 ]; then
    echo "   ✅ Success"
    total_expenses=$(echo "$expense_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['total_annual_expenses'])")
    echo "   Total Annual Expenses: \$$(printf '%'.0f $total_expenses)"
else
    echo "   ❌ Failed"
    total_expenses=0
fi

# 2. Recalculate Retirement Metrics
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 STEP 2: Recalculate Retirement Metrics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Calculating retirement projections..."

retirement_response=$(curl -s "$API_URL/api/retirement/calculation")
if [ $? -eq 0 ]; then
    echo "   ✅ Success"
    net_worth=$(echo "$retirement_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['current_net_worth'])")
    retirement_age=$(echo "$retirement_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['withdrawal_start_age'])")
    income_sufficient=$(echo "$retirement_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['income_sufficient_before_ss'])")
    echo "   Current Net Worth: \$$(printf '%'.0f $net_worth)"
    echo "   Retirement Age: $retirement_age"
    echo "   Income Sufficient: $income_sufficient"
else
    echo "   ❌ Failed"
    net_worth=0
    retirement_age=0
    income_sufficient="false"
fi

# 3. Recalculate Portfolio Allocation
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💼 STEP 3: Recalculate Portfolio Allocation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Calculating optimal portfolio..."

portfolio_response=$(curl -s "$API_URL/api/portfolio-allocation/calculate")
if [ $? -eq 0 ]; then
    echo "   ✅ Success"
    portfolio_yield=$(echo "$portfolio_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['portfolio_yield'])")
    after_tax_income=$(echo "$portfolio_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['total_after_tax_income'])")
    surplus=$(echo "$portfolio_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['expense_analysis']['after_tax_surplus'])")
    coverage=$(echo "$portfolio_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['expense_analysis']['coverage_ratio'])")
    echo "   Portfolio Yield: ${portfolio_yield}%"
    echo "   After-Tax Income: \$$(printf '%'.0f $after_tax_income)"
    echo "   After-Tax Surplus: \$$(printf '%'.0f $surplus)"
    echo "   Coverage Ratio: ${coverage}%"
else
    echo "   ❌ Failed"
    portfolio_yield=0
    after_tax_income=0
    surplus=0
    coverage=0
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ RECALCULATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  • Net Worth: \$$(printf '%'.0f $net_worth)"
echo "  • Annual Expenses: \$$(printf '%'.0f $total_expenses)"
echo "  • Portfolio Yield: ${portfolio_yield}%"
echo "  • After-Tax Income: \$$(printf '%'.0f $after_tax_income)"
echo "  • Surplus: \$$(printf '%'.0f $surplus)"
echo "  • Retirement Age: $retirement_age"
echo "  • Income Sufficient: $income_sufficient"
echo ""
echo "All calculations refreshed at $TIMESTAMP"
echo "======================================================================="

# Log to file
LOG_DIR="/Users/ssachdeva/Desktop/my-app/.claude/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/recalculation_$(date '+%Y%m%d').log"

{
    echo "Recalculation Run: $TIMESTAMP"
    echo "Net Worth: $net_worth"
    echo "Expenses: $total_expenses"
    echo "Yield: $portfolio_yield"
    echo "Income: $after_tax_income"
    echo "Surplus: $surplus"
    echo "---"
} >> "$LOG_FILE"

echo ""
echo "📝 Log saved to: $LOG_FILE"
