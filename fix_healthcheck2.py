#!/usr/bin/env python3
"""Fix the Docker healthcheck on remote server - v2."""

import paramiko

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {HOST}...")
client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
print("Connected!\n")

# Read current docker-compose.yml
print("Reading current docker-compose.yml...")
stdin, stdout, stderr = client.exec_command("cat /opt/tg-matrix/docker-compose.yml", timeout=30)
content = stdout.read().decode('utf-8')
print(f"Read {len(content)} bytes\n")

# Replace the healthcheck line
old_healthcheck = 'test: ["CMD", "curl", "-f", "http://localhost:8000/health"]'
new_healthcheck = 'test: ["CMD-SHELL", "python -c \\"import urllib.request; urllib.request.urlopen(\'http://localhost:8000/health\')\\" || exit 1"]'

if old_healthcheck in content:
    content = content.replace(old_healthcheck, new_healthcheck)
    print("Healthcheck line found and replaced.\n")
else:
    print("WARNING: Could not find expected healthcheck line.")
    print("Looking for pattern...")
    # Try to find the healthcheck section
    for i, line in enumerate(content.split('\n')):
        if 'healthcheck' in line.lower() or 'curl' in line:
            print(f"  Line {i}: {line}")

# Write back
print("Writing updated docker-compose.yml...")

# Use sftp to write the file
sftp = client.open_sftp()
with sftp.file('/opt/tg-matrix/docker-compose.yml', 'w') as f:
    f.write(content)
sftp.close()
print("File written.\n")

# Verify the change
print("Verifying change...")
stdin, stdout, stderr = client.exec_command("grep -A5 healthcheck /opt/tg-matrix/docker-compose.yml", timeout=30)
print(stdout.read().decode('utf-8'))

# Recreate the API container to apply the new healthcheck
print("\nRecreating API container to apply new healthcheck...")
stdin, stdout, stderr = client.exec_command("cd /opt/tg-matrix && docker compose up -d --force-recreate api", timeout=120)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

# Wait and check status
import time
print("\nWaiting 15 seconds for container to stabilize...")
time.sleep(15)

print("Checking container status...")
stdin, stdout, stderr = client.exec_command("cd /opt/tg-matrix && docker compose ps", timeout=30)
print(stdout.read().decode('utf-8'))

print("Checking health status...")
stdin, stdout, stderr = client.exec_command('cd /opt/tg-matrix && docker inspect --format="{{json .State.Health}}" tg-matrix-api-1 | python3 -m json.tool', timeout=30)
print(stdout.read().decode('utf-8'))

client.close()
print("\nDone!")
