#!/bin/bash

# Setup Daily Recalculation
# This script sets up a cron job to run recalculations daily

SCRIPT_DIR="/Users/ssachdeva/Documents/Claude/my-app/.claude/skills"
RECALC_SCRIPT="$SCRIPT_DIR/recalculate.sh"
CRON_TIME="0 10 * * *"  # 10:00 AM daily

echo "======================================================================="
echo "Setting up Daily Portfolio Recalculation"
echo "======================================================================="
echo ""
echo "This will add a cron job to run recalculations daily at 10:00 AM"
echo ""

# Check if script exists
if [ ! -f "$RECALC_SCRIPT" ]; then
    echo "❌ Error: Recalculation script not found at $RECALC_SCRIPT"
    exit 1
fi

# Make sure script is executable
chmod +x "$RECALC_SCRIPT"

# Create a wrapper script that ensures backend is running
WRAPPER_SCRIPT="$SCRIPT_DIR/recalculate-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << 'EOF'
#!/bin/bash

# Wrapper script to ensure backend is running before recalculation
API_URL="http://localhost:8000"

# Check if backend is running
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "Backend not running. Please start the backend first."
    exit 1
fi

# Run recalculation
/Users/ssachdeva/Documents/Claude/my-app/.claude/skills/recalculate.sh
EOF

chmod +x "$WRAPPER_SCRIPT"

# Check if cron job already exists
CRON_ENTRY="$CRON_TIME $WRAPPER_SCRIPT >> /Users/ssachdeva/Documents/Claude/my-app/.claude/logs/cron.log 2>&1"

if crontab -l 2>/dev/null | grep -q "recalculate-wrapper.sh"; then
    echo "⚠️  Cron job already exists"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep recalculate
    echo ""
    read -p "Remove and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove old entry
        (crontab -l 2>/dev/null | grep -v "recalculate-wrapper.sh") | crontab -
        echo "✅ Old cron job removed"
    else
        echo "Exiting without changes"
        exit 0
    fi
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo ""
echo "✅ Daily recalculation cron job added!"
echo ""
echo "Schedule: Every day at 10:00 AM"
echo "Log file: /Users/ssachdeva/Documents/Claude/my-app/.claude/logs/cron.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"
echo ""
echo "======================================================================="

# Test the recalculation immediately
echo ""
read -p "Run recalculation now to test? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    "$WRAPPER_SCRIPT"
fi
