#!/usr/bin/env python3
"""Additional server diagnostics to investigate null responses."""

import paramiko

# Server credentials
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# Additional diagnostic commands
COMMANDS = [
    ("1. Check database files/data", "cd /opt/tg-matrix && ls -la data/ 2>/dev/null || echo 'No data directory'"),
    ("2. Check SQLite database", "cd /opt/tg-matrix && docker compose exec -T api python -c \"import sqlite3; c = sqlite3.connect('/app/data/tg_matrix.db'); print('Tables:', [t[0] for t in c.execute('SELECT name FROM sqlite_master WHERE type=table').fetchall()])\" 2>&1"),
    ("3. Check API route handlers for credentials", "cd /opt/tg-matrix && docker compose exec -T api grep -r 'credentials' /app/*.py 2>&1 | head -30"),
    ("4. Check web_server.py routes", "cd /opt/tg-matrix && docker compose exec -T api head -200 /app/web_server.py 2>&1"),
    ("5. Test with verbose curl", "curl -v http://localhost:8000/api/v1/credentials 2>&1"),
    ("6. Check if there are any stored credentials in DB", "cd /opt/tg-matrix && docker compose exec -T api python -c \"import sqlite3; c = sqlite3.connect('/app/data/tg_matrix.db'); print([row for row in c.execute('SELECT * FROM api_credentials LIMIT 5').fetchall()])\" 2>&1"),
    ("7. Check docker volume mounts", "cd /opt/tg-matrix && docker compose config 2>&1 | grep -A5 volumes"),
    ("8. Check available API endpoints", "cd /opt/tg-matrix && docker compose exec -T api grep -E '@routes\\.(get|post)' /app/web_server.py 2>&1 || grep -E 'add_route|router' /app/web_server.py 2>&1"),
]

def main():
    print(f"Connecting to {HOST}...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print(f"Connected successfully!\n")
        print("=" * 80)
        
        for title, cmd in COMMANDS:
            print(f"\n{title}")
            print("-" * 60)
            print(f"Command: {cmd}")
            print("-" * 60)
            
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            output = stdout.read().decode('utf-8', errors='replace')
            error = stderr.read().decode('utf-8', errors='replace')
            
            if output:
                print(output)
            if error:
                print(f"STDERR: {error}")
            if not output and not error:
                print("(No output)")
            
            print("=" * 80)
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
