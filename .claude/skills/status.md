# Project Status Check

Check the status of your portfolio tracker project - database, servers, and dependencies.

## What this does
1. Checks if database exists and shows size
2. Checks if backend/frontend dependencies are installed
3. Checks if development servers are running
4. Shows recent database activity

## Usage
Invoke with: `/status`

## Implementation

```bash
echo "🔍 Portfolio Tracker Status Check"
echo "=================================="
echo ""

# Check database
echo "📊 Database Status:"
if [ -f backend/portfolio_tracker.db ]; then
    DB_SIZE=$(du -h backend/portfolio_tracker.db | cut -f1)
    echo "  ✅ Database exists ($DB_SIZE)"

    # Count records
    cd backend
    source venv/bin/activate 2>/dev/null
    ACCOUNT_COUNT=$(sqlite3 portfolio_tracker.db "SELECT COUNT(*) FROM brokerage_accounts;" 2>/dev/null)
    EXPENSE_COUNT=$(sqlite3 portfolio_tracker.db "SELECT COUNT(*) FROM expenses;" 2>/dev/null)
    echo "  📈 Accounts: $ACCOUNT_COUNT"
    echo "  💰 Expenses: $EXPENSE_COUNT"
    cd ..
else
    echo "  ❌ Database not found - run /init-database"
fi
echo ""

# Check backend dependencies
echo "🔧 Backend Status:"
if [ -d backend/venv ]; then
    echo "  ✅ Virtual environment exists"
else
    echo "  ❌ Virtual environment missing - run: cd backend && python3 -m venv venv"
fi
echo ""

# Check frontend dependencies
echo "⚛️  Frontend Status:"
if [ -d frontend/node_modules ]; then
    echo "  ✅ Node modules installed"
else
    echo "  ❌ Node modules missing - run: cd frontend && npm install"
fi
echo ""

# Check running servers
echo "🚀 Running Servers:"
BACKEND_RUNNING=$(lsof -i :8000 -t 2>/dev/null)
FRONTEND_RUNNING=$(lsof -i :5173 -t 2>/dev/null)

if [ -n "$BACKEND_RUNNING" ]; then
    echo "  ✅ Backend running on port 8000 (PID: $BACKEND_RUNNING)"
else
    echo "  ⭕ Backend not running"
fi

if [ -n "$FRONTEND_RUNNING" ]; then
    echo "  ✅ Frontend running on port 5173 (PID: $FRONTEND_RUNNING)"
else
    echo "  ⭕ Frontend not running"
fi
echo ""

# Recent backups
echo "💾 Recent Backups:"
BACKUP_COUNT=$(ls backend/portfolio_tracker_backup_*.db 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "  $BACKUP_COUNT backup(s) found"
    ls -lt backend/portfolio_tracker_backup_*.db 2>/dev/null | head -3 | awk '{print "  - " $9}'
else
    echo "  No backups found - run /backup-data"
fi
echo ""

echo "Quick Actions:"
echo "  /start-servers - Start development servers"
echo "  /init-database - Initialize/reset database"
echo "  /backup-data   - Create database backup"
```

## Notes
- Run this anytime to check project health
- Useful before starting work or troubleshooting
