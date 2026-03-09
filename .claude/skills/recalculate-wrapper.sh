#!/bin/bash

# Wrapper script to ensure backend is running before recalculation
API_URL="http://localhost:8000"

# Check if backend is running
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    echo "Backend not running. Please start the backend first."
    exit 1
fi

# Run recalculation
/Users/ssachdeva/Desktop/my-app/.claude/skills/recalculate.sh
