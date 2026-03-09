# Portfolio Management Skills

Automated scripts for recalculating portfolio metrics and refreshing dashboard data.

## Available Skills

### 1. recalculate.sh - Daily Portfolio Summary
**Purpose**: Quick portfolio status check with concise summary

**What it does**:
1. Calculates total annual expenses
2. Updates retirement metrics
3. Recalculates optimal portfolio allocation
4. Shows summary with key metrics

**When to use**:
- Daily automated check (runs at 10:00 AM via cron)
- Quick portfolio status overview
- Verify calculations after changes

**Usage**:
```bash
cd /Users/ssachdeva/Desktop/my-app
./.claude/skills/recalculate.sh
```

**Output Example**:
```
Net Worth: $8,676,000
Annual Expenses: $241,027
Portfolio Yield: 3.97%
After-Tax Income: $259,433
Surplus: $18,406
Coverage Ratio: 107.6%
```

---

### 2. refresh-dashboard.sh - Update Dashboard & Summary Pages
**Purpose**: Refresh all dashboard and summary data after expense or account changes

**What it does**:
1. Recalculates total annual expenses
2. Updates retirement projections
3. Recalculates optimal portfolio allocation
4. Refreshes dashboard quick stats
5. Updates asset allocation breakdown

**When to use**: ⭐ **Use this after ANY of these changes:**
- ✅ Adding, updating, or deleting expenses
- ✅ Adding, updating, or deleting accounts
- ✅ Modifying portfolio holdings
- ✅ Changing retirement assumptions
- ✅ Updating expense categories

**Usage**:
```bash
cd /Users/ssachdeva/Desktop/my-app
./.claude/skills/refresh-dashboard.sh
```

**Output**:
- Detailed JSON responses for each calculation
- ✅/❌ status indicators
- Logs saved to `.claude/logs/refresh_YYYYMMDD.log`

**Frontend Integration**:
- Backend calculations update immediately
- Frontend React Query cache refreshes on next page navigation
- No manual refresh needed - data updates automatically

---

## Automation

### Daily Recalculation (10:00 AM)
The `recalculate.sh` skill runs automatically every day at 10:00 AM.

**Check cron status**:
```bash
crontab -l
```

**Modify schedule**:
```bash
crontab -e
```

---

## Data Consistency

⭐ **IMPORTANT**: All data in the app comes from two sources:
- **Expenses** → `Expense` table (detailed tracking)
- **Net Worth** → `BrokerageAccount` table

See **[DATA_CONSISTENCY_RULES.md](./DATA_CONSISTENCY_RULES.md)** for complete documentation.

**Verification Status**: ✅ All calculations consistent (verified 2026-03-02)

---

## Quick Reference

| When You... | Run This Skill |
|-------------|----------------|
| Want portfolio status | `recalculate.sh` |
| Change expenses | `refresh-dashboard.sh` ⭐ |
| Update accounts | `refresh-dashboard.sh` ⭐ |
| Rebalance portfolio | `refresh-dashboard.sh` ⭐ |
| Daily check | Automatic at 10 AM |

---

## Logs

- `.claude/logs/recalculation_YYYYMMDD.log` - Daily recalculation logs
- `.claude/logs/refresh_YYYYMMDD.log` - Dashboard refresh logs

---

## API Endpoints Used

- `GET /api/expenses/total-annual` - Calculate annual expenses
- `GET /api/retirement/calculation` - Retirement projections
- `GET /api/portfolio-allocation/calculate` - Optimal portfolio
- `GET /api/dashboard/quick-stats` - Dashboard statistics
- `GET /api/dashboard/allocation` - Asset allocation

---

## Prerequisites

Backend server must be running: `http://localhost:8000`

Start backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

---

## Troubleshooting

**Skills return errors:**
1. Ensure backend is running
2. Check `API_URL` (default: http://localhost:8000)
3. Review error messages in output
4. Check log files in `.claude/logs/`

**Frontend not updating:**
1. Navigate to different page and back
2. Hard refresh (Cmd+Shift+R on Mac)
3. Check browser console for errors
4. Verify backend returned HTTP 200
