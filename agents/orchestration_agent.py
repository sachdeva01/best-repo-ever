"""
Orchestration Agent
-------------------
Runs two sub-agents in sequence with a 30-second gap:
  1. page_load_agent   — measures dashboard load performance
  2. connectivity_agent — tests all API and external connectivity

After both complete, uses Claude to produce an executive summary and
writes a full diagnostic report to agents/reports/diagnostic_YYYY-MM-DD_HH-MM.md
"""

import os
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from keychain import load_anthropic_key
load_anthropic_key()

import anthropic
import page_load_agent
import connectivity_agent

DIVIDER = "=" * 60
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
client = anthropic.Anthropic()


def _tail(text: str, chars: int = 4000) -> str:
    """Return the last `chars` characters — where the final report section lives."""
    return text[-chars:] if len(text) > chars else text


def generate_summary(perf_report: str, conn_report: str) -> str:
    """Ask Claude to produce a concise executive summary from both agent reports.
    Passes only the tail of each report (final findings) to stay within TPM limits.
    Retries up to 5 times with backoff on rate limit errors.
    """
    print("\n[orchestrator] Waiting 60s before generating summary (TPM cooldown)...")
    time.sleep(60)
    print("[orchestrator] Generating executive summary...")

    prompt = f"""You are a technical report writer summarising two diagnostic agent runs.

Write a concise executive summary in Markdown with these sections:
1. **Overall Status** — one of: ✅ ALL PASS | ⚠️ WARNINGS | ❌ FAILURES
2. **Performance Agent Findings** — bullet points of key results and timings
3. **Connectivity Agent Findings** — bullet points of pass/fail per endpoint and any issues
4. **Action Items** — prioritised list (Critical / High / Medium / Low) of things to fix

Keep it tight — no padding, no restating what is obvious. Highlight numbers.

--- PERFORMANCE AGENT REPORT (final section) ---
{_tail(perf_report)}

--- CONNECTIVITY AGENT REPORT (final section) ---
{_tail(conn_report)}
"""
    for attempt in range(5):
        try:
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        except anthropic.RateLimitError:
            wait = 30 * (attempt + 1)
            print(f"[orchestrator] rate limit on summary, waiting {wait}s…")
            time.sleep(wait)

    return "_(Summary generation failed due to rate limits — see full agent outputs below)_"


def write_report(perf_report: str, conn_report: str, summary: str) -> str:
    """Write the full diagnostic report to a timestamped file."""
    os.makedirs(REPORTS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    path = os.path.join(REPORTS_DIR, f"diagnostic_{timestamp}.md")

    with open(path, "w") as f:
        f.write(f"# Diagnostic Report — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write("---\n\n")
        f.write("## Executive Summary\n\n")
        f.write(summary)
        f.write("\n\n---\n\n")
        f.write("## Agent 1 — Page Load Performance (full output)\n\n")
        f.write("```\n")
        f.write(perf_report)
        f.write("\n```\n\n")
        f.write("---\n\n")
        f.write("## Agent 2 — Connectivity Testing (full output)\n\n")
        f.write("```\n")
        f.write(conn_report)
        f.write("\n```\n")

    return path


def run():
    started_at = datetime.now()
    print(DIVIDER)
    print("ORCHESTRATION AGENT")
    print(f"Started: {started_at.strftime('%Y-%m-%d %H:%M:%S')}")
    print(DIVIDER)

    # ── Sub-agent 1: Page Load Performance ─────────────────────────
    print("\n>>> [1/2] Dispatching — Page Load Performance Agent\n")
    perf_start = time.time()
    perf_report = page_load_agent.run()
    perf_elapsed = round(time.time() - perf_start, 1)
    print(f"\n[orchestrator] Agent 1 finished in {perf_elapsed}s")

    # ── 60-second gap (lets TPM window reset before Agent 2 starts) ──
    print(f"[orchestrator] Waiting 60 seconds before dispatching Agent 2...")
    for remaining in range(60, 0, -15):
        print(f"[orchestrator] {remaining}s remaining...")
        time.sleep(15)

    # ── Sub-agent 2: Connectivity Testing ───────────────────────────
    print("\n>>> [2/2] Dispatching — Connectivity Testing Agent\n")
    conn_start = time.time()
    conn_report = connectivity_agent.run()
    conn_elapsed = round(time.time() - conn_start, 1)
    print(f"\n[orchestrator] Agent 2 finished in {conn_elapsed}s")

    # ── Generate summary and write report ───────────────────────────
    summary = generate_summary(perf_report, conn_report)
    report_path = write_report(perf_report, conn_report, summary)

    total_elapsed = round(time.time() - perf_start, 1)

    print(f"\n{DIVIDER}")
    print("ORCHESTRATION COMPLETE")
    print(DIVIDER)
    print(f"\nTotal time:  {total_elapsed}s")
    print(f"Report:      {report_path}")
    print(f"\n{'─' * 60}")
    print("EXECUTIVE SUMMARY")
    print("─" * 60)
    print(summary)

    return report_path


if __name__ == "__main__":
    run()
