import sqlite3

for db in ["auth.db", "tgmatrix.db", "tgai_server.db"]:
    try:
        c = sqlite3.connect(f"/app/data/{db}")
        tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        print(f"{db}: {tables}")
        if "users" in str(tables):
            c.row_factory = sqlite3.Row
            for row in c.execute("SELECT id, username, display_name, subscription_tier, telegram_id FROM users LIMIT 5"):
                print(dict(row))
    except Exception as e:
        print(f"{db}: {e}")
