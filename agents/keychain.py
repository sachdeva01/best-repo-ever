"""Load the Anthropic API key from macOS Keychain into the environment."""

import subprocess
import os


def load_anthropic_key():
    if os.environ.get("ANTHROPIC_API_KEY"):
        return  # already set

    try:
        key = subprocess.check_output(
            ["security", "find-generic-password", "-s", "anthropic-api-key", "-a", os.environ["USER"], "-w"],
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        if key:
            os.environ["ANTHROPIC_API_KEY"] = key
    except Exception:
        pass
