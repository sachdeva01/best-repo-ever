"""
Sequential agent pipeline:
  Agent 1 (Page Load Performance) runs to completion,
  then Agent 2 (Connectivity Testing) is automatically triggered.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import page_load_agent
import connectivity_agent

DIVIDER = "=" * 60

if __name__ == "__main__":
    print(DIVIDER)
    print("PIPELINE START")
    print(DIVIDER)

    print("\n>>> STEP 1: Page Load Performance Agent\n")
    try:
        page_load_agent.run()
    except Exception as e:
        print(f"[PERF ERROR] {e}")

    print(f"\n{DIVIDER}")
    print("Agent 1 complete — handing off to Agent 2...")
    print(f"{DIVIDER}\n")

    print(">>> STEP 2: Connectivity Testing Agent\n")
    try:
        connectivity_agent.run()
    except Exception as e:
        print(f"[CONN ERROR] {e}")

    print(f"\n{DIVIDER}")
    print("PIPELINE COMPLETE")
    print(DIVIDER)
