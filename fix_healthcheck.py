#!/usr/bin/env python3
"""Fix the Docker healthcheck on remote server."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# Commands to fix the healthcheck
COMMANDS = [
    ("Backup current docker-compose.yml", 
     "cd /opt/tg-matrix && cp docker-compose.yml docker-compose.yml.bak"),
    
    ("Update healthcheck to use Python instead of curl",
     '''cd /opt/tg-matrix && sed -i 's|test: \\["CMD", "curl", "-f", "http://localhost:8000/health"\\]|test: ["CMD-SHELL", "python -c \\"import urllib.request; urllib.request.urlopen('\''http://localhost:8000/health'\\'')\\" || exit 1"]|g' docker-compose.yml'''),
    
    ("Show updated healthcheck config",
     "cd /opt/tg-matrix && grep -A5 healthcheck docker-compose.yml"),
    
    ("Restart the API container to apply new healthcheck",
     "cd /opt/tg-matrix && docker compose up -d api"),
    
    ("Wait for container to start",
     "sleep 10"),
    
    ("Check new container status",
     "cd /opt/tg-matrix && docker compose ps"),
    
    ("Check healthcheck status",
     'cd /opt/tg-matrix && docker inspect --format="{{json .State.Health.Status}}" tg-matrix-api-1'),
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
    print(f"$ {cmd}")
    print()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
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
print("Done. Healthcheck fix applied!")
