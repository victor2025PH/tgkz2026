import paramiko
import time

HOST = "165.154.210.154"
USER = "ubuntu"
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
        server_name tgw.usdt2026.cc;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://$host$request_uri; }
    }
    
    server {
        listen 80;
        server_name 165.154.210.154 localhost;
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
        location / { try_files $uri $uri/ /index.html; }
    }
    
    server {
        listen 443 ssl;
        http2 on;
        server_name tgw.usdt2026.cc;
        
        ssl_certificate /etc/letsencrypt/live/tgw.usdt2026.cc/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/tgw.usdt2026.cc/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        
        root /usr/share/nginx/html;
        
        location /health { return 200 "OK"; add_header Content-Type text/plain; }
        location /api/ {
            proxy_pass http://api:8000/api/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto https;
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

def run_command(ssh, cmd, description, use_sudo=False):
    print(f"\n{'='*60}")
    print(f">> {description}")
    print(f">> Command: {cmd}")
    print('='*60)
    
    if use_sudo:
        # For sudo commands, we need to use a pseudo-terminal
        channel = ssh.get_transport().open_session()
        channel.get_pty()
        channel.exec_command(f'echo "{PASSWORD}" | sudo -S {cmd}')
        output = ""
        while True:
            if channel.recv_ready():
                output += channel.recv(4096).decode('utf-8', errors='replace')
            if channel.exit_status_ready():
                break
            time.sleep(0.1)
        # Get remaining output
        while channel.recv_ready():
            output += channel.recv(4096).decode('utf-8', errors='replace')
        # Remove password echo if present
        lines = output.split('\n')
        filtered_lines = [l for l in lines if PASSWORD not in l and '[sudo]' not in l]
        output = '\n'.join(filtered_lines)
        print(output)
        return output
    else:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out)
        if err:
            print(f"STDERR: {err}")
        return out + err

def main():
    print(f"Connecting to {HOST} as {USER}...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(
            HOST,
            port=22,
            username=USER,
            password=PASSWORD,
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        print("SUCCESS: Connected!")
        
        # Step 1: Check container status
        run_command(ssh, "cd /opt/tg-matrix && docker compose ps", "Step 1: Check container status")
        
        # Step 2: Check nginx logs
        run_command(ssh, "cd /opt/tg-matrix && docker compose logs --tail=10 web", "Step 2: Check nginx logs")
        
        # Step 3: Check SSL certificates
        ssl_check = run_command(ssh, "ls -la /etc/letsencrypt/live/tgw.usdt2026.cc/", "Step 3: Check SSL certificates", use_sudo=True)
        ssl_exists = "fullchain.pem" in ssl_check and "privkey.pem" in ssl_check
        print(f"\n>>> SSL certificates exist: {ssl_exists}")
        
        # Step 4: Check current nginx.conf
        run_command(ssh, "cat /opt/tg-matrix/nginx.conf | head -50", "Step 4: Check current nginx.conf")
        
        if ssl_exists:
            # Step 5: Update nginx.conf with HTTPS support
            print(f"\n{'='*60}")
            print(">> Step 5: Updating nginx.conf with HTTPS support")
            print('='*60)
            
            # Write the new config
            escaped_config = NGINX_CONFIG.replace("'", "'\"'\"'")
            cmd = f"echo '{escaped_config}' > /opt/tg-matrix/nginx.conf"
            run_command(ssh, cmd, "Writing new nginx.conf", use_sudo=True)
            
            # Verify the new config
            run_command(ssh, "cat /opt/tg-matrix/nginx.conf", "Verifying new nginx.conf")
            
            # Step 6: Check and update docker-compose.yml for SSL volume mount
            print(f"\n{'='*60}")
            print(">> Step 6: Check docker-compose.yml for SSL volume mount")
            print('='*60)
            
            compose_content = run_command(ssh, "cat /opt/tg-matrix/docker-compose.yml", "Reading docker-compose.yml")
            
            if "/etc/letsencrypt:/etc/letsencrypt" not in compose_content:
                print("\n>>> SSL volume mount not found. Adding it...")
                # Use sed to add the volume mount after the existing volumes line for web service
                run_command(ssh, 
                    r'''sed -i '/web:/,/volumes:/{/volumes:/a\      - /etc/letsencrypt:/etc/letsencrypt:ro}' /opt/tg-matrix/docker-compose.yml''',
                    "Adding SSL volume mount", use_sudo=True)
                
                # Verify
                run_command(ssh, "cat /opt/tg-matrix/docker-compose.yml", "Verify updated docker-compose.yml")
            else:
                print("\n>>> SSL volume mount already exists in docker-compose.yml")
            
            # Step 7: Restart web container
            run_command(ssh, "cd /opt/tg-matrix && docker compose restart web", "Step 7: Restart web container")
            
            # Step 8: Wait and check status
            print("\n>>> Waiting 5 seconds...")
            time.sleep(5)
            run_command(ssh, "cd /opt/tg-matrix && docker compose ps", "Step 8: Check container status after restart")
            
            # Step 9: Test HTTPS
            run_command(ssh, "curl -s -k https://localhost/health", "Step 9a: Test HTTPS on localhost")
            run_command(ssh, "curl -s -k https://tgw.usdt2026.cc/health", "Step 9b: Test HTTPS on tgw.usdt2026.cc")
            
        else:
            print("\n>>> SSL certificates do NOT exist. Skipping HTTPS configuration.")
            print(">>> You need to first obtain SSL certificates using certbot.")
        
        print(f"\n{'='*60}")
        print("COMPLETED ALL STEPS")
        print('='*60)
        
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
