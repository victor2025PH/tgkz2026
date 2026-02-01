#!/usr/bin/env python3
"""Additional remote server diagnostics."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

COMMANDS = [
    ("Docker healthcheck logs", 'cd /opt/tg-matrix && docker inspect --format="{{json .State.Health}}" tg-matrix-api-1 2>&1'),
    ("Check docker-compose healthcheck config", "cd /opt/tg-matrix && grep -A10 healthcheck docker-compose.yml 2>/dev/null || echo 'No healthcheck in compose file'"),
    ("Test API with verbose curl", "curl -v http://localhost:8000/api/v1/credentials 2>&1 | head -40"),
    ("Check if data directory exists", "ls -la /opt/tg-matrix/data/ 2>/dev/null || echo 'No data dir'"),
    ("Check API routes", "curl -s http://localhost:8000/api/v1/ 2>&1"),
    ("Check accounts endpoint", "curl -s http://localhost:8000/api/v1/accounts 2>&1"),
    ("Check API command with get-accounts", 'curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d \'{"command": "get-accounts"}\' 2>&1'),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {HOST}...")
client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
print("Connected!\n")

for title, cmd in COMMANDS:
    print("=" * 80)
    print(f"{title}")
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
    print()

client.close()
print("Done.")
