#!/bin/bash
APP_DIR="/Users/ssachdeva/Documents/Claude/my-app"

echo "[$(date)] Starting my-app..."

# Start backend
cd "$APP_DIR/backend"
source venv/bin/activate
uvicorn main:app --port 8000 &
echo "[$(date)] Backend started (PID $!)"

# Start frontend
cd "$APP_DIR/frontend"
/usr/local/bin/npm run dev &
echo "[$(date)] Frontend started (PID $!)"
