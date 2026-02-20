# Start Development Servers

Start both backend and frontend development servers for the portfolio tracker.

## What this does
1. Starts FastAPI backend on port 8000 with auto-reload
2. Starts React frontend on port 5173 with Vite

## Usage
Invoke with: `/start-servers`

## Implementation

```bash
# Start backend in background
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend in background
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "Backend running on http://localhost:8000 (PID: $BACKEND_PID)"
echo "Frontend running on http://localhost:5173 (PID: $FRONTEND_PID)"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"
```

## Notes
- Backend requires virtual environment to be set up first
- Frontend requires npm install to have been run
- Both servers will auto-reload on file changes
