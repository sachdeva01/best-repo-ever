# My App

A full-stack web application with FastAPI backend and React frontend.

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + Vite
- **Database**: SQLite (development)

## Project Structure

```
my-app/
├── backend/          # FastAPI application
│   ├── main.py       # Main API application
│   └── requirements.txt
├── frontend/         # React application
│   ├── src/
│   │   ├── api/      # API client
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the development server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/items` - Get list of items

## Development

The frontend is configured to proxy API requests to the backend during development. You can run both servers simultaneously for full-stack development.
