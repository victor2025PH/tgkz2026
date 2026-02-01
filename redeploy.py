#!/usr/bin/env python3
import paramiko
import sys

HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run(ssh, cmd, timeout=300):
    full_cmd = f"echo '{PASSWORD}' | sudo -S bash -c '{cmd}'"
    print(f">>> {cmd[:70]}...")
    stdin, stdout, stderr = ssh.exec_command(full_cmd, timeout=timeout)
    out = stdout.read().decode()
    for line in out.split('\n'):
        if line.strip() and '[sudo]' not in line:
            print(line)
    return stdout.channel.recv_exit_status()

def main():
    print("=" * 50)
    print("  TG-Matrix Redeploy")
    print("=" * 50)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)
    print("Connected!")
    
    print("\n[1/3] Pulling latest code...")
    run(ssh, "cd /opt/tg-matrix && git pull origin main")
    
    print("\n[2/3] Rebuilding containers...")
    run(ssh, "cd /opt/tg-matrix && docker compose down 2>/dev/null || true")
    run(ssh, "cd /opt/tg-matrix && docker compose build --no-cache", timeout=600)
    
    print("\n[3/3] Starting services...")
    run(ssh, "cd /opt/tg-matrix && docker compose up -d")
    
    print("\n[Done] Checking status...")
    run(ssh, "cd /opt/tg-matrix && docker compose ps")
    run(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    
    print("\n" + "=" * 50)
    print(f"  Access: http://{HOST}")
    print("=" * 50)
    ssh.close()

if __name__ == "__main__":
    main()
