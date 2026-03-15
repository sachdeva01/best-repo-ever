"""
Agent 1 — Page Load Performance
Measures dashboard load time and investigates root causes if > 5 seconds.
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


SYSTEM = f"""You are a performance diagnostic agent for a React + FastAPI web app.
App directory: {APP_DIR}
Frontend: http://localhost:5173
Backend:  http://localhost:8000

Your job:
1. Measure how long the dashboard (http://localhost:5173/dashboard) takes to respond.
   Use curl with timing to measure it.
2. Also time key backend API calls that the dashboard depends on.
3. Check whether total load is under 5 seconds.
4. If any endpoint is slow (> 1s) or the total is > 5s, investigate why:
   - Check the relevant backend router code
   - Look for slow database queries, missing indexes, or expensive computations
   - Check network overhead
5. Produce a clear report: what passed, what failed, and specific fixes if needed.

Be thorough but concise. Use tools to gather real data."""


def run():
    print("=" * 60)
    print("AGENT 1 — Page Load Performance")
    print("=" * 60)

    messages = [
        {"role": "user", "content": "Run the full page load performance check now."}
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
    print("AGENT 1 COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run()
