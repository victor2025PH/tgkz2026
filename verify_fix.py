#!/usr/bin/env python3
"""Verify nginx fix and force restart"""

import paramiko
import time

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out + err

# Check the new nginx.conf
print("=== Verifying nginx.conf update ===")
print(run("grep ssl_certificate /opt/tg-matrix/nginx.conf"))

# Check docker-compose.yml SSL mount
print("\n=== Verifying docker-compose.yml ===")
print(run("grep letsencrypt /opt/tg-matrix/docker-compose.yml"))

# Force recreate web container
print("\n=== Force recreating web container ===")
print(run("cd /opt/tg-matrix && docker compose stop web && docker compose rm -f web && docker compose up -d web"))

# Wait and check
time.sleep(8)
print("\n=== Container status ===")
print(run("cd /opt/tg-matrix && docker compose ps"))

# Check logs
print("\n=== Web container logs ===")
print(run("cd /opt/tg-matrix && docker compose logs --tail=15 web 2>&1"))

# Test endpoints
print("\n=== Testing HTTP ===")
print(run("curl -s http://localhost/health"))

print("\n=== Testing HTTPS ===")
print(run("curl -s -k https://localhost/health"))

ssh.close()
print("\n=== Done ===")
