#!/usr/bin/env python3
"""Remote deployment script for TG-Matrix server."""
import paramiko
import time
import sys

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

NGINX_CONFIG = '''worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    server {
        listen 80;
        server_name tgw.usdt2026.cc 165.154.210.154 localhost;
        root /usr/share/nginx/html;
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ {
            proxy_pass http://api:8000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_connect_timeout 120s;
            proxy_send_timeout 120s;
            proxy_read_timeout 120s;
        }
        location /ws {
            proxy_pass http://api:8000/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
        location / { try_files $uri $uri/ /index.html; }
    }
}
'''

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
    
    try:
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!\n")
        
        # Step 1: Pull latest code
        print("\n" + "="*60)
        print("STEP 1: Pull latest code")
        print("="*60)
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main")
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && git log -1 --format='%h %s'")
        
        if "f1960c9" in out:
            print("\n✓ Commit f1960c9 verified!")
        else:
            print(f"\n⚠ Expected commit f1960c9, got: {out.strip()}")
        
        # Step 2: Rebuild and restart API
        print("\n" + "="*60)
        print("STEP 2: Rebuild and restart API")
        print("="*60)
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && docker compose build api", timeout=300)
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && docker compose up -d api", timeout=60)
        
        # Step 3: Fix nginx config
        print("\n" + "="*60)
        print("STEP 3: Fix nginx config")
        print("="*60)
        
        # Write nginx config using heredoc
        nginx_cmd = f'''cat > /opt/tg-matrix/nginx.conf << 'NGINX_EOF'
{NGINX_CONFIG}
NGINX_EOF'''
        out, err, code = run_command(ssh, nginx_cmd)
        
        # Verify nginx config was written
        out, err, code = run_command(ssh, "head -5 /opt/tg-matrix/nginx.conf")
        
        # Restart web
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && docker compose restart web", timeout=60)
        
        # Step 4: Wait and check status
        print("\n" + "="*60)
        print("STEP 4: Wait 15 seconds then check status")
        print("="*60)
        print("Waiting 15 seconds...")
        time.sleep(15)
        out, err, code = run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
        
        # Step 5: Test send-code endpoint
        print("\n" + "="*60)
        print("STEP 5: Test send-code endpoint")
        print("="*60)
        curl_cmd = '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}'
'''
        out, err, code = run_command(ssh, curl_cmd)
        
        print("\n" + "="*60)
        print("DEPLOYMENT COMPLETE")
        print("="*60)
        print(f"\nHTTP Response Body:\n{out}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
