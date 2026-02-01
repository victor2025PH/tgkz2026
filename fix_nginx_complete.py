#!/usr/bin/env python3
"""Fix nginx with HTTP-only config."""
import paramiko
import time

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
    print(f"Running: {cmd[:100]}...")
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
    
    # Step 1: Write HTTP-only nginx config
    print("Step 1: Writing HTTP-only nginx config...")
    nginx_cmd = f'''cat > /opt/tg-matrix/nginx.conf << 'NGINX_EOF'
{NGINX_CONFIG}
NGINX_EOF'''
    run_command(ssh, nginx_cmd)
    
    # Verify
    print("Verifying nginx.conf...")
    run_command(ssh, "head -20 /opt/tg-matrix/nginx.conf")
    
    # Step 2: Recreate web container to pick up new config
    print("\nStep 2: Recreating web container...")
    run_command(ssh, "cd /opt/tg-matrix && docker compose up -d --force-recreate web")
    
    # Wait
    print("Waiting 10 seconds...")
    time.sleep(10)
    
    # Step 3: Check status
    print("\nStep 3: Checking status...")
    run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
    run_command(ssh, "cd /opt/tg-matrix && docker compose logs web --tail 5")
    
    # Step 4: Test endpoints
    print("\nStep 4: Testing endpoints...")
    run_command(ssh, "curl -s http://localhost/health")
    run_command(ssh, "curl -s http://localhost/api/health")
    
    # Final send-code test
    print("\nFinal: Testing send-code...")
    curl_cmd = '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}'
'''
    out, _, _ = run_command(ssh, curl_cmd)
    
    print("\n" + "="*60)
    print("FINAL RESULT:")
    print("="*60)
    print(out)
    
    ssh.close()

if __name__ == "__main__":
    main()
