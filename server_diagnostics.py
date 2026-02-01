#!/usr/bin/env python3
"""Server diagnostics script to check TG-Matrix container status and API health."""

import paramiko

# Server credentials
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# Commands to run
COMMANDS = [
    ("1. Check container status", "cd /opt/tg-matrix && docker compose ps"),
    ("2. Check API health", "curl -s http://localhost:8000/health"),
    ("3. Check API logs for recent errors", "cd /opt/tg-matrix && docker compose logs --tail=50 api 2>&1"),
    ("4. Test API credentials endpoint", "curl -s http://localhost:8000/api/v1/credentials"),
    ("5. Test send-code endpoint (get-api-credentials)", 'curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d \'{"command": "get-api-credentials"}\''),
    ("6. Check nginx access logs", "cd /opt/tg-matrix && docker compose logs --tail=20 web 2>&1"),
    ("7. Test the full chain through nginx", "curl -s https://localhost/api/v1/credentials -k"),
]

def main():
    print(f"Connecting to {HOST}...")
    
    # Create SSH client
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
            
            stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
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
