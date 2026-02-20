# Initialize Database

Initialize or reset the portfolio tracker database with fresh schema and seed data.

## What this does
1. Removes existing database file
2. Runs init_db.py to create tables and seed expense categories
3. Creates default retirement configuration

## Usage
Invoke with: `/init-database`

## Implementation

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Backup existing database if it exists
if [ -f portfolio_tracker.db ]; then
    BACKUP_NAME="portfolio_tracker_backup_$(date +%Y%m%d_%H%M%S).db"
    cp portfolio_tracker.db "$BACKUP_NAME"
    echo "Existing database backed up to: $BACKUP_NAME"
    rm portfolio_tracker.db
fi

# Initialize fresh database
python init_db.py

echo ""
echo "✅ Database initialized successfully!"
echo "📊 37 expense categories created"
echo "⚙️  Default retirement config created"
echo ""
echo "Next steps:"
echo "1. Start servers: /start-servers"
echo "2. Add your accounts on http://localhost:5173/accounts"
echo "3. Add your expenses on http://localhost:5173/expense-tracker"
```

## Warning
⚠️  This will delete all existing data! A backup is created automatically.
