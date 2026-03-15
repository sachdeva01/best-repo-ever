"""
Agent 2 — Connectivity Testing
Tests connectivity to Yahoo Finance, backend APIs, and debugs any failures.
"""

import json
import subprocess
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from keychain import load_anthropic_key
load_anthropic_key()

import anthropic
try:
    import requests as _requests
except ImportError:
    _requests = None

client = anthropic.Anthropic()

# Network timeout in seconds (3 s)
ENDPOINT_TIMEOUT = 3.0

TOOLS = [
    {
        "name": "check_endpoint",
        "description": (
            "Make an HTTP request to a single endpoint and return the status code, "
            "latency in ms, and any error. Uses a 3 s network timeout; times out "
            "gracefully rather than hanging."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url":    {"type": "string", "description": "Full URL to request"},
                "method": {"type": "string", "description": "HTTP method: GET or POST", "enum": ["GET", "POST"]},
                "body":   {"type": "object", "description": "Optional JSON body for POST requests"},
            },
            "required": ["url", "method"],
        },
    },
    {
        "name": "run_command",
        "description": "Run a shell command and return stdout + stderr",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run"},
            },
            "required": ["command"],
        },
    },
    {
        "name": "read_file",
        "description": "Read a file from disk",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute file path"},
            },
            "required": ["path"],
        },
    },
]

APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV_PYTHON = os.path.join(APP_DIR, "backend", "venv", "bin", "python")


def check_endpoint(url: str, method: str = "GET", body: dict = None) -> str:
    """Make a single HTTP request with a 5 ms timeout and return a structured result."""
    if _requests is None:
        return json.dumps({"error": "requests library not available — install it in the venv"})

    t_start = time.perf_counter()
    try:
        if method.upper() == "POST":
            resp = _requests.post(url, json=body or {}, timeout=ENDPOINT_TIMEOUT)
        else:
            resp = _requests.get(url, timeout=ENDPOINT_TIMEOUT)

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return json.dumps({
            "status":     resp.status_code,
            "latency_ms": latency_ms,
            "error":      None,
        })

    except _requests.exceptions.Timeout:
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return json.dumps({
            "status":     None,
            "latency_ms": latency_ms,
            "error":      f"Timeout after {ENDPOINT_TIMEOUT * 1000:.0f} ms — server unreachable or too slow",
        })
    except _requests.exceptions.ConnectionError as e:
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return json.dumps({
            "status":     None,
            "latency_ms": latency_ms,
            "error":      f"Connection error (server may be down): {e}",
        })
    except Exception as e:
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return json.dumps({
            "status":     None,
            "latency_ms": latency_ms,
            "error":      f"Unexpected error: {e}",
        })


def run_command(command: str) -> str:
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=30
        )
        output = result.stdout
        if result.stderr:
            output += f"\n[stderr]: {result.stderr}"
        return output or "(no output)"
    except subprocess.TimeoutExpired:
        return "Command timed out after 30 seconds"
    except Exception as e:
        return f"Error: {e}"


def read_file(path: str) -> str:
    try:
        with open(path) as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"


def execute_tool(name: str, tool_input: dict) -> str:
    if name == "check_endpoint":
        return check_endpoint(
            url=tool_input["url"],
            method=tool_input.get("method", "GET"),
            body=tool_input.get("body"),
        )
    elif name == "run_command":
        return run_command(tool_input["command"])
    elif name == "read_file":
        return read_file(tool_input["path"])
    return "Unknown tool"


SYSTEM = f"""You are a connectivity diagnostic agent for a React + FastAPI web app.

## Known App Context (do NOT rediscover — use this directly)
- Backend: http://localhost:8000 (FastAPI)
- Python venv: {VENV_PYTHON}
- Market data router: {APP_DIR}/backend/routers/market_data.py
- Auth router:        {APP_DIR}/backend/routers/auth.py

## Endpoints to test
GET  http://localhost:8000/api/health               → expect 200
GET  http://localhost:8000/api/accounts             → expect 200
GET  http://localhost:8000/api/holdings             → expect 200
GET  http://localhost:8000/api/market-data          → expect 200, check values are non-zero
POST http://localhost:8000/api/auth/login           → expect 401 (with dummy creds)

## Your job (skip all discovery — run tests immediately)
1. Use the `check_endpoint` tool to test each of the 5 endpoints above.
   - Each call has a 3 s network timeout and returns {{status, latency_ms, error}}.
   - A null status with a Timeout error means the server is unreachable — do NOT read
     router source in that case; report a network/process issue instead.
   - A null status with a Connection error means the server process is likely not running.
   - Only read a router file when the server responds but returns an unexpected status code.
2. Test Yahoo Finance via yfinance: run `{VENV_PYTHON} -c "import yfinance as yf; t=yf.Ticker('SPY'); print(t.fast_info.last_price)"`
3. Produce a structured report: PASS/FAIL table with latencies, and root cause + fix for any failures.
   Distinguish clearly between: (a) network/process errors, (b) code-level errors.

Do NOT explore the filesystem. All paths are given above. Use at most 7 tool calls."""


def run() -> str:
    """Run the connectivity agent and return the full report as a string."""
    collected = []

    def emit(text: str):
        print(text)
        collected.append(text)

    emit("=" * 60)
    emit("AGENT 2 — Connectivity Testing")
    emit("=" * 60)

    messages = [
        {"role": "user", "content": "Run the full connectivity test suite now."}
    ]

    while True:
        for attempt in range(5):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=4096,
                    system=SYSTEM,
                    tools=TOOLS,
                    messages=messages,
                )
                break
            except anthropic.RateLimitError:
                wait = 20 * (attempt + 1)
                emit(f"[rate limit] waiting {wait}s…")
                time.sleep(wait)
        else:
            emit("[error] exceeded retries")
            return "\n".join(collected)

        messages.append({"role": "assistant", "content": response.content})

        for block in response.content:
            if hasattr(block, "type") and block.type == "text":
                emit(block.text)

        if response.stop_reason == "end_turn":
            break

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"\n[tool: {block.name}] {json.dumps(block.input)[:120]}")
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})

    emit("\n" + "=" * 60)
    emit("AGENT 2 COMPLETE")
    emit("=" * 60)
    return "\n".join(collected)


if __name__ == "__main__":
    run()
