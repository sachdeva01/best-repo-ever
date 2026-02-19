# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack web application with FastAPI backend (Python) and React frontend (JavaScript). The backend runs on port 8000, frontend on port 5173 with Vite dev server.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate  # First time setup
pip install -r requirements.txt                    # Install dependencies
uvicorn main:app --reload --port 8000              # Run dev server
uvicorn main:app --reload --log-level debug        # Run with debug logging
```

### Frontend (React + Vite)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Run dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Running Both Servers
Start backend and frontend in separate terminals. Frontend proxies `/api/*` requests to backend automatically via Vite config.

## Architecture

### Backend Structure
- `backend/main.py` - FastAPI application entry point with CORS middleware configured for http://localhost:5173
- API routes follow `/api/*` pattern for frontend proxy compatibility
- CORS is configured to allow frontend origin during development

### Frontend Structure
- `frontend/src/api/client.js` - Centralized API client using axios
  - All backend API calls go through this module
  - Base URL configurable via `VITE_API_URL` environment variable
- `frontend/src/components/` - React components
- `frontend/src/App.jsx` - Main application component

### Key Patterns
- **API Communication**: Frontend uses axios client in `src/api/client.js` for all backend requests
- **CORS**: Backend explicitly allows frontend origin (localhost:5173) in middleware
- **Proxy**: Vite dev server proxies `/api/*` to `http://localhost:8000` to avoid CORS during development
- **Environment Variables**: Backend uses `.env` file, frontend uses `VITE_*` prefixed variables

## Code Conventions

### Backend
- FastAPI async/await for all route handlers
- Pydantic models for request/response validation
- CORS middleware configured in main.py

### Frontend
- Functional components with hooks
- API calls abstracted in `src/api/client.js`
- CSS modules or component-scoped CSS files

## Common Tasks

### Adding a New API Endpoint
1. Add route handler in `backend/main.py` under `/api/*` path
2. Create corresponding function in `frontend/src/api/client.js`
3. Backend will hot-reload automatically with `--reload` flag

### Adding a New React Component
1. Create component in `frontend/src/components/`
2. Import and use in `App.jsx` or other components
3. Vite HMR (Hot Module Replacement) updates automatically

### Database Setup
Currently using placeholder data. To add database:
1. Uncomment SQLAlchemy in `backend/requirements.txt`
2. Create models and database initialization
3. Update `.env.example` with database configuration

## Testing

### Backend Tests
```bash
cd backend
pip install pytest pytest-asyncio httpx
pytest
```

### Frontend Tests
```bash
cd frontend
npm install --save-dev vitest @testing-library/react
npm run test
```

## Deployment Notes

- Backend: Deploy FastAPI with production ASGI server (Gunicorn + Uvicorn workers)
- Frontend: Build with `npm run build`, serve `dist/` directory
- Update CORS origins in backend for production domain
- Set `VITE_API_URL` environment variable for frontend to point to production API
