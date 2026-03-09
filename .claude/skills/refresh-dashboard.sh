#!/bin/bash

# Skill: Refresh Dashboard and Summary
# Usage: Refresh all dashboard and summary calculations after expense or account changes
# This ensures all pages show up-to-date information

API_URL="${API_URL:-http://localhost:8000}"
DATE=$(date +"%Y-%m-%d %H:%M:%S")

echo "════════════════════════════════════════════════════════════════════════════════"
echo "🔄 REFRESHING DASHBOARD & SUMMARY DATA"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "Timestamp: $DATE"
echo ""

# Track if any errors occurred
ERRORS=0

# Function to call API and check result
call_api() {
    local endpoint=$1
    local description=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 $description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    result=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    http_code=$(echo "$result" | tail -1)
    response=$(echo "$result" | sed '$d')

    if [ "$http_code" -eq 200 ]; then
        echo "✅ Success (HTTP $http_code)"
        echo "$response" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data:
        print(json.dumps(data, indent=2))
except:
    pass
" 2>/dev/null || echo "$response"
        echo ""
        return 0
    else
        echo "❌ Failed (HTTP $http_code)"
        echo "$response"
        echo ""
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# 1. Recalculate Annual Expenses
call_api "/api/expenses/total-annual" "Calculating Total Annual Expenses"

# 2. Recalculate Retirement Metrics
call_api "/api/retirement/calculation" "Recalculating Retirement Metrics"

# 3. Recalculate Portfolio Allocation
call_api "/api/portfolio-allocation/calculate" "Recalculating Optimal Portfolio Allocation"

# 4. Refresh Dashboard Quick Stats
call_api "/api/dashboard/quick-stats" "Refreshing Dashboard Quick Stats"

# 5. Refresh Asset Allocation
call_api "/api/dashboard/allocation" "Refreshing Asset Allocation"

# Summary
echo "════════════════════════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CALCULATIONS REFRESHED SUCCESSFULLY"
    echo ""
    echo "Dashboard and Summary pages are now up to date with latest data."
    echo "Frontend will automatically reflect changes on next page load or refresh."
else
    echo "⚠️  COMPLETED WITH $ERRORS ERROR(S)"
    echo ""
    echo "Some calculations may not be up to date. Check the errors above."
fi
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Log to file
LOG_DIR="/Users/ssachdeva/Desktop/my-app/.claude/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/refresh_$(date +%Y%m%d).log"

echo "Refresh Run: $DATE" >> "$LOG_FILE"
echo "Errors: $ERRORS" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

exit $ERRORS
