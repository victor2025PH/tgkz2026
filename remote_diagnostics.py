#!/usr/bin/env python3
"""Remote server diagnostics script."""

import paramiko
import sys

# Server credentials
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# Commands to run
COMMANDS = [
    ("1. Container Status", "cd /opt/tg-matrix && docker compose ps"),
    ("2. API Health Check", "curl -s http://localhost:8000/health"),
    ("3. API Logs (last 50 lines)", "cd /opt/tg-matrix && docker compose logs --tail=50 api 2>&1"),
    ("4. Test Credentials Endpoint", "curl -s http://localhost:8000/api/v1/credentials"),
    ("5. Test Command Endpoint", 'curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d \'{"command": "get-api-credentials"}\''),
    ("6. Nginx Access Logs", "cd /opt/tg-matrix && docker compose logs --tail=20 web 2>&1"),
    ("7. Full Chain Through Nginx", "curl -s https://localhost/api/v1/credentials -k"),
]


def main():
    print(f"Connecting to {HOST}...")
    
    # Create SSH client
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!\n")
        print("=" * 80)
        
        for title, cmd in COMMANDS:
            print(f"\n{'=' * 80}")
            print(f"{title}")
            print(f"Command: {cmd}")
            print("-" * 80)
            
            stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
            
            output = stdout.read().decode('utf-8', errors='replace')
            error = stderr.read().decode('utf-8', errors='replace')
            
            if output:
                print(output)
            if error:
                print(f"STDERR: {error}")
            
            if not output and not error:
                print("(No output)")
                
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        client.close()
        print("\n" + "=" * 80)
        print("Diagnostics complete.")


if __name__ == "__main__":
    main()
