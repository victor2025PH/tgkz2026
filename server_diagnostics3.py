#!/usr/bin/env python3
"""Deep diagnostics for API implementation."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

COMMANDS = [
    ("1. List all Python files in container", "cd /opt/tg-matrix && docker compose exec -T api find /app -name '*.py' -type f 2>&1 | head -50"),
    ("2. Check http_server.py", "cd /opt/tg-matrix && docker compose exec -T api cat /app/api/http_server.py 2>&1 | head -100"),
    ("3. Check correct database tables", "cd /opt/tg-matrix && docker compose exec -T api python3 -c \"import sqlite3; c = sqlite3.connect('/app/data/tgai_server.db'); print([t[0] for t in c.execute(\\\"SELECT name FROM sqlite_master WHERE type='table'\\\").fetchall()])\" 2>&1"),
    ("4. Check credentials in correct DB", "cd /opt/tg-matrix && docker compose exec -T api python3 -c \"import sqlite3; c = sqlite3.connect('/app/data/tgai_server.db'); cursor = c.cursor(); cursor.execute('PRAGMA table_info(api_credentials)'); print(cursor.fetchall())\" 2>&1"),
    ("5. Check if credentials table exists in correct db", "cd /opt/tg-matrix && docker compose exec -T api python3 -c \"import sqlite3; c = sqlite3.connect('/app/data/tgai_server.db'); print('Tables:', [t[0] for t in c.execute(\\\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%credential%'\\\").fetchall()])\" 2>&1"),
    ("6. Show all routes", "cd /opt/tg-matrix && docker compose exec -T api grep -rn 'def.*credentials\\|route.*credentials\\|/api/v1/credentials' /app/ 2>&1 | head -30"),
    ("7. Check container file structure", "cd /opt/tg-matrix && docker compose exec -T api ls -la /app/ 2>&1"),
    ("8. Check api directory", "cd /opt/tg-matrix && docker compose exec -T api ls -la /app/api/ 2>&1"),
]

def main():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print(f"Connected!\n" + "=" * 80)
        
        for title, cmd in COMMANDS:
            print(f"\n{title}")
            print("-" * 60)
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            output = stdout.read().decode('utf-8', errors='replace')
            error = stderr.read().decode('utf-8', errors='replace')
            print(output if output else "(No output)")
            if error: print(f"STDERR: {error}")
            print("=" * 80)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
