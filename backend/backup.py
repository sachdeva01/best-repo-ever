"""
Auto-backup for portfolio_tracker.db.
Called on every server startup — copies the DB before any migrations or seeds run.
Keeps the 7 most recent backups; older ones are pruned automatically.
"""

import logging
import shutil
import os
import glob
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "portfolio_tracker.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")
KEEP = 7  # number of backups to retain


def backup_database():
    # Skip if DB doesn't exist yet (first ever run)
    if not os.path.exists(DB_PATH):
        logger.info("No database found — skipping backup (first run)")
        return

    # Skip if DB is empty (nothing worth backing up)
    if os.path.getsize(DB_PATH) == 0:
        logger.info("Database is empty — skipping backup")
        return

    os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    dest = os.path.join(BACKUP_DIR, f"portfolio_tracker_{timestamp}.db")
    shutil.copy2(DB_PATH, dest)
    size_kb = round(os.path.getsize(dest) / 1024, 1)
    logger.info("Backup saved: %s (%.1f KB)", dest, size_kb)

    # Prune: keep only the KEEP most recent backups
    backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "portfolio_tracker_*.db")))
    to_delete = backups[:-KEEP] if len(backups) > KEEP else []
    for old in to_delete:
        os.remove(old)
        logger.info("Pruned old backup: %s", os.path.basename(old))
