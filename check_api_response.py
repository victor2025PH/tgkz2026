#!/usr/bin/env python3
"""Check API response and logs."""
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
    
    # Wait a bit more for API to be fully ready
    print("Waiting 10 more seconds for API health check...")
    time.sleep(10)
    
    # Check docker status
    run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
    
    # Check API logs for any errors
    print("\n" + "="*60)
    print("Checking API logs (last 30 lines):")
    print("="*60)
    run_command(ssh, "cd /opt/tg-matrix && docker compose logs api --tail 30")
    
    # Test with curl -v to see full response
    print("\n" + "="*60)
    print("Testing send-code with verbose curl:")
    print("="*60)
    curl_cmd = '''curl -v -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}' 2>&1'''
    run_command(ssh, curl_cmd)
    
    # Also test the health endpoint
    print("\n" + "="*60)
    print("Testing health endpoint:")
    print("="*60)
    run_command(ssh, "curl -s http://localhost:8000/api/health")
    
    ssh.close()

if __name__ == "__main__":
    main()
