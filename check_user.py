import sqlite3

# Check tgmatrix.db
c = sqlite3.connect("/app/data/tgmatrix.db")
c.row_factory = sqlite3.Row

# Find user by username or telegram_id
print("=== tgmatrix.db users ===")
for row in c.execute("SELECT * FROM users WHERE username LIKE '%dthb%' OR telegram_id = '8041810715'"):
    print(dict(row))

# Check user_sessions
print("\n=== user_sessions ===")
for row in c.execute("SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT 3"):
    print(dict(row))

# Check if there's membership data elsewhere
print("\n=== licenses (recent) ===")
for row in c.execute("SELECT * FROM licenses ORDER BY activated_at DESC LIMIT 5"):
    print(dict(row))
