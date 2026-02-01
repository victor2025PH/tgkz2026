#!/usr/bin/env python3
"""Check command execution flow."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

COMMANDS = [
    ("1. Check _execute_command method", "cd /opt/tg-matrix && docker compose exec -T api sed -n '240,300p' /app/api/http_server.py 2>&1"),
    ("2. Check if backend_service is initialized", "cd /opt/tg-matrix && docker compose logs --tail=100 api 2>&1 | grep -i 'backend\\|initialized\\|init'"),
    ("3. List data directory inside container", "cd /opt/tg-matrix && docker compose exec -T api ls -la /app/data/ 2>&1"),
    ("4. Check command router", "cd /opt/tg-matrix && docker compose exec -T api cat /app/api/command_router.py 2>&1 | head -80"),
    ("5. Test direct command execution", "cd /opt/tg-matrix && docker compose exec -T api python3 -c \"import asyncio; from api.command_router import CommandRouter; print('Router imported')\" 2>&1"),
    ("6. Check startup logs for backend init", "cd /opt/tg-matrix && docker compose logs api 2>&1 | head -100"),
    ("7. Check for api_credentials.json in mounted volume", "ls -la /opt/tg-matrix/data/*.json 2>/dev/null || echo 'No json files in data'"),
    ("8. Check handlers registration", "cd /opt/tg-matrix && docker compose exec -T api grep -n 'get-api-credentials' /app/api/handlers/*.py 2>&1"),
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
