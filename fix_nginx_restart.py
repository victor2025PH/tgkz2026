#!/usr/bin/env python3
"""Fix nginx restart issue and verify everything is working."""
import paramiko
import time

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, cmd, timeout=120):
    """Run command and return output."""
    print(f"\n{'='*60}")
    print(f"Running: {cmd}")
    print('='*60)
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(f"STDERR: {err}")
    print(f"Exit code: {exit_code}")
    return out, err, exit_code

def main():
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
    print("Connected!\n")
    
    # Check web logs
    print("Checking web container logs...")
    run_command(ssh, "cd /opt/tg-matrix && docker compose logs web --tail 20")
    
    # Check nginx config file
    print("Checking nginx config on host...")
    run_command(ssh, "cat /opt/tg-matrix/nginx.conf")
    
    # Restart web container
    print("Restarting web container...")
    run_command(ssh, "cd /opt/tg-matrix && docker compose restart web")
    
    # Wait and check status
    print("Waiting 10 seconds...")
    time.sleep(10)
    
    run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
    
    # Check web logs again
    run_command(ssh, "cd /opt/tg-matrix && docker compose logs web --tail 10")
    
    ssh.close()

if __name__ == "__main__":
    main()
