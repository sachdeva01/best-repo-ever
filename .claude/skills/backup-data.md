# Backup Portfolio Data

Create a timestamped backup of your portfolio database.

## What this does
1. Creates a backup of the SQLite database file
2. Stores it with a timestamp in the backend directory
3. Lists all existing backups

## Usage
Invoke with: `/backup-data`

## Implementation

```bash
cd backend

if [ ! -f portfolio_tracker.db ]; then
    echo "❌ No database found to backup!"
    exit 1
fi

# Create backup with timestamp
BACKUP_NAME="portfolio_tracker_backup_$(date +%Y%m%d_%H%M%S).db"
cp portfolio_tracker.db "$BACKUP_NAME"

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_NAME" | cut -f1)

echo "✅ Backup created successfully!"
echo ""
echo "📦 Backup file: $BACKUP_NAME"
echo "📊 Size: $BACKUP_SIZE"
echo ""
echo "Existing backups:"
ls -lh portfolio_tracker_backup_*.db 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "To restore a backup:"
echo "  cp $BACKUP_NAME portfolio_tracker.db"
```

## Notes
- Backups are stored in the backend directory
- Consider moving old backups to a dedicated backup folder
- You can restore any backup by copying it over portfolio_tracker.db
