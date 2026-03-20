"""
Migrate local SQLite data to hosted Supabase via the Fly.io REST API.
Run: python3 migrate_to_supabase.py <password>
"""
import sys
import sqlite3
import requests

BASE_URL = "https://retirement-app-backend.fly.dev"
DB_PATH = "/Users/ssachdeva/Documents/Claude/my-app/backend/portfolio_tracker.db"

def login(password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "ssachdeva", "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    print("Logged in successfully")
    return {"Authorization": f"Bearer {token}"}

def read_sqlite():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    data = {}
    for table in ["brokerage_accounts", "expenses", "retirement_config", "holdings"]:
        cur.execute(f"SELECT * FROM {table}")
        data[table] = [dict(r) for r in cur.fetchall()]
    conn.close()
    return data

def migrate_accounts(data, headers):
    id_map = {}  # old_id -> new_id
    for acc in data["brokerage_accounts"]:
        payload = {
            "name": acc["name"],
            "brokerage_name": acc["brokerage_name"],
            "account_type": acc["account_type"],
            "investments": acc["investments"],
            "cash": acc["cash"],
            "dividend_yield": acc["dividend_yield"],
        }
        r = requests.post(f"{BASE_URL}/api/accounts", json=payload, headers=headers)
        r.raise_for_status()
        new_id = r.json()["id"]
        id_map[acc["id"]] = new_id
        print(f"  Account: {acc['name']} -> id {new_id}")
    return id_map

def migrate_expenses(data, headers):
    for exp in data["expenses"]:
        payload = {
            "category_id": exp["category_id"],
            "amount": exp["amount"],
            "description": exp["description"],
            "expense_date": exp["expense_date"].replace(" ", "T") if exp["expense_date"] else "2025-01-01T00:00:00",
            "is_recurring": bool(exp["is_recurring"]),
            "recurrence_period": exp["recurrence_period"],
            "recurrence_interval_years": exp["recurrence_interval_years"],
            "expense_type": exp["expense_type"] or "RECURRING",
        }
        r = requests.post(f"{BASE_URL}/api/expenses", json=payload, headers=headers)
        r.raise_for_status()
        print(f"  Expense: {exp['description'][:50]}")

def migrate_retirement_config(data, headers):
    cfg = data["retirement_config"][0]
    payload = {k: cfg[k] for k in cfg if k not in ("id", "created_at", "updated_at")}
    r = requests.post(f"{BASE_URL}/api/retirement/config", json=payload, headers=headers)
    r.raise_for_status()
    print("  Retirement config updated")

def migrate_holdings(data, headers, account_id_map):
    for h in data["holdings"]:
        new_account_id = account_id_map.get(h["account_id"])
        if not new_account_id:
            print(f"  WARNING: no mapping for account_id {h['account_id']}, skipping holding {h['symbol']}")
            continue
        payload = {
            "account_id": new_account_id,
            "symbol": h["symbol"],
            "name": h["name"],
            "asset_type": h["asset_type"],
            "quantity": h["quantity"],
            "price_per_share": h["price_per_share"],
            "dividend_yield": h["dividend_yield"],
        }
        r = requests.post(f"{BASE_URL}/api/holdings", json=payload, headers=headers)
        r.raise_for_status()
        print(f"  Holding: {h['symbol']} in account {new_account_id}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 migrate_to_supabase.py <password>")
        sys.exit(1)

    password = sys.argv[1]
    print("Reading local SQLite data...")
    data = read_sqlite()
    print(f"  {len(data['brokerage_accounts'])} accounts, {len(data['expenses'])} expenses, "
          f"{len(data['holdings'])} holdings")

    print("\nLogging into hosted app...")
    headers = login(password)

    print("\nSkipping accounts (already migrated)...")
    # Build id map by fetching existing accounts
    r = requests.get(f"{BASE_URL}/api/accounts", headers=headers)
    r.raise_for_status()
    remote_accounts = r.json()
    account_id_map = {}
    for local_acc in data["brokerage_accounts"]:
        for remote_acc in remote_accounts:
            if local_acc["name"] == remote_acc["name"]:
                account_id_map[local_acc["id"]] = remote_acc["id"]
                break
    print(f"  Mapped {len(account_id_map)} accounts")

    print("\nSkipping expenses (already migrated)...")

    print("\nMigrating retirement config...")
    migrate_retirement_config(data, headers)

    print("\nMigrating holdings...")
    migrate_holdings(data, headers, account_id_map)

    print("\nMigration complete!")

if __name__ == "__main__":
    main()
