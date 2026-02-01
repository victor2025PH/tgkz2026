#!/usr/bin/env python3
"""Final health check verification."""

import paramiko
import time

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print(f"Connecting to {HOST}...")
client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
print("Connected!\n")

# Wait for healthcheck to run (30 second interval)
print("Waiting 35 seconds for healthcheck to run...")
time.sleep(35)

print("\n" + "=" * 80)
print("Container Status:")
print("=" * 80)
stdin, stdout, stderr = client.exec_command("cd /opt/tg-matrix && docker compose ps", timeout=30)
print(stdout.read().decode('utf-8'))

print("\n" + "=" * 80)
print("Health Check Details:")
print("=" * 80)
stdin, stdout, stderr = client.exec_command('cd /opt/tg-matrix && docker inspect --format="{{json .State.Health}}" tg-matrix-api-1 | python3 -m json.tool', timeout=30)
print(stdout.read().decode('utf-8'))

print("\n" + "=" * 80)
print("API Health Endpoint:")
print("=" * 80)
stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health", timeout=30)
print(stdout.read().decode('utf-8'))

print("\n" + "=" * 80)
print("Testing Full API Chain (through nginx):")
print("=" * 80)
stdin, stdout, stderr = client.exec_command("curl -s https://localhost/api/health -k", timeout=30)
output = stdout.read().decode('utf-8')
print(output if output else "(No output - trying alternate path)")

if not output:
    stdin, stdout, stderr = client.exec_command("curl -s https://localhost/health -k", timeout=30)
    print(stdout.read().decode('utf-8'))

client.close()
print("\nDone!")
