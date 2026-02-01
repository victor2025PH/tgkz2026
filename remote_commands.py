#!/usr/bin/env python3
"""Execute commands on remote server via SSH"""

import paramiko
import time

# Server details
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

# Nginx config content
NGINX_CONF = '''worker_processes auto;
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

def run_command(ssh, command, description):
    """Run a command and return output"""
    print(f"\n{'='*60}")
    print(f"[TASK] {description}")
    print(f"[CMD] {command}")
    print(f"{'='*60}")
    
    stdin, stdout, stderr = ssh.exec_command(command, timeout=120)
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print(f"[OUTPUT]\n{output}")
    if error:
        print(f"[STDERR]\n{error}")
    
    return output, error

def main():
    # Connect to server
    print(f"Connecting to {HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
        
        # 1. Check API logs for send-code command
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose logs --tail=50 api 2>&1 | grep -i 'send-code\\|handle_send_code\\|verification' | head -20",
            "1. Check API logs for send-code command"
        )
        
        # 2. Check ALL recent API logs
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose logs --tail=30 api 2>&1",
            "2. Check ALL recent API logs"
        )
        
        # 3. Write nginx config
        print(f"\n{'='*60}")
        print("[TASK] 3. Write nginx.conf to server")
        print(f"{'='*60}")
        
        # Use SFTP to write the file
        sftp = ssh.open_sftp()
        with sftp.file('/opt/tg-matrix/nginx.conf', 'w') as f:
            f.write(NGINX_CONF)
        sftp.close()
        print("[OUTPUT] nginx.conf written successfully!")
        
        # Restart web container
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose restart web",
            "3b. Restart web container"
        )
        
        # Wait for container to start
        print("\nWaiting 5 seconds for container to start...")
        time.sleep(5)
        
        # 4. Check container status
        run_command(ssh,
            "cd /opt/tg-matrix && docker compose ps",
            "4. Check final container status"
        )
        
        # 5. Test send-code via nginx
        run_command(ssh,
            '''curl -s -X POST http://localhost/api/command -H "Content-Type: application/json" -d '{"command": "send-code", "payload": {"phone": "+639277356118", "api_id": "21825589", "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79"}}\'''',
            "5. Test send-code via nginx"
        )
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()
        print("\nConnection closed.")

if __name__ == "__main__":
    main()
