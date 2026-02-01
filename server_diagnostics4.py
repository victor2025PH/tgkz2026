#!/usr/bin/env python3
"""Check the get_credentials implementation and API credential pool."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

COMMANDS = [
    ("1. Check get_credentials handler (lines 560-600)", "cd /opt/tg-matrix && docker compose exec -T api sed -n '560,620p' /app/api/http_server.py 2>&1"),
    ("2. Check api_credential_pool.py", "cd /opt/tg-matrix && docker compose exec -T api head -100 /app/api_credential_pool.py 2>&1"),
    ("3. Check credentials file location", "cd /opt/tg-matrix && docker compose exec -T api ls -la /app/data/*.json /app/*.json 2>&1"),
    ("4. Check for api_credentials in database schema", "cd /opt/tg-matrix && docker compose exec -T api grep -r 'api_credentials' /app/migrations/*.py 2>&1 | head -20"),
    ("5. Check if credential pool has data", "cd /opt/tg-matrix && docker compose exec -T api python3 -c \"from api_credential_pool import APICredentialPool; pool = APICredentialPool('/app/data'); print('Credentials:', pool.list_credentials())\" 2>&1"),
    ("6. Check environment variables for API", "cd /opt/tg-matrix && docker compose exec -T api env | grep -i api 2>&1"),
    ("7. Check if there is a config file", "cd /opt/tg-matrix && docker compose exec -T api cat /app/data/config.json 2>&1 || echo 'No config.json'"),
    ("8. Check main.py handle_get_api_credentials", "cd /opt/tg-matrix && docker compose exec -T api sed -n '22090,22120p' /app/main.py 2>&1"),
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
