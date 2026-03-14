"""
Agent 2 — Connectivity Testing
Tests connectivity to Yahoo Finance, backend APIs, and debugs any failures.
"""

import json
import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", ".env"))

import anthropic
import time

client = anthropic.Anthropic()

TOOLS = [
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
    if name == "run_command":
        return run_command(tool_input["command"])
    elif name == "read_file":
        return read_file(tool_input["path"])
    return "Unknown tool"


SYSTEM = f"""You are a connectivity diagnostic agent for a React + FastAPI web app.
App directory: {APP_DIR}
Backend: http://localhost:8000
Python venv: {VENV_PYTHON}

Your job:
1. Test all backend API endpoints and report their status codes and response times.
   Key endpoints to check:
   - GET  /api/health
   - GET  /api/accounts
   - GET  /api/holdings
   - GET  /api/market-data
   - POST /api/auth/login (test with dummy creds, expect 401)

2. Test Yahoo Finance connectivity:
   - Use curl to hit finance.yahoo.com and check reachability
   - Use the venv python to run: `{VENV_PYTHON} -c "import yfinance as yf; t=yf.Ticker('SPY'); print(t.fast_info)"`
   - Check if market_data router is fetching correctly

3. For any failure, read the relevant backend router source to understand why it's failing
   and suggest a fix.

4. Produce a structured report:
   - PASS / FAIL for each endpoint
   - Latency numbers
   - Root cause + fix for any failures

Be methodical. Use tools to gather real data before drawing conclusions."""


def run():
    print("=" * 60)
    print("AGENT 2 — Connectivity Testing")
    print("=" * 60)

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
                print(f"[rate limit] waiting {wait}s…")
                time.sleep(wait)
        else:
            print("[error] exceeded retries")
            return

        messages.append({"role": "assistant", "content": response.content})

        for block in response.content:
            if hasattr(block, "type") and block.type == "text":
                print(block.text)

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

    print("\n" + "=" * 60)
    print("AGENT 2 COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run()
