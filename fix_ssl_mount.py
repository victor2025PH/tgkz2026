import paramiko
import time

HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, cmd, description, use_sudo=False):
    print(f"\n{'='*60}")
    print(f">> {description}")
    print(f">> Command: {cmd}")
    print('='*60)
    
    if use_sudo:
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
        while channel.recv_ready():
            output += channel.recv(4096).decode('utf-8', errors='replace')
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
        
        # Check current container status and logs
        run_command(ssh, "cd /opt/tg-matrix && docker compose ps", "Check container status")
        run_command(ssh, "cd /opt/tg-matrix && docker compose logs --tail=20 web", "Check nginx logs")
        
        # The issue is that ./certbot/conf is mounted as /etc/letsencrypt
        # But the actual SSL certs are at /etc/letsencrypt on the HOST
        # We need to change the mount from ./certbot/conf to /etc/letsencrypt
        
        print("\n>>> Fixing docker-compose.yml to mount /etc/letsencrypt directly...")
        
        # Update docker-compose.yml using sed to replace the certbot mount with direct letsencrypt mount
        run_command(ssh, 
            r"sed -i 's|./certbot/conf:/etc/letsencrypt:ro|/etc/letsencrypt:/etc/letsencrypt:ro|g' /opt/tg-matrix/docker-compose.yml",
            "Update SSL volume mount", use_sudo=True)
        
        # Verify the change
        run_command(ssh, "cat /opt/tg-matrix/docker-compose.yml | head -20", "Verify docker-compose.yml")
        
        # Recreate the web container with new config
        run_command(ssh, "cd /opt/tg-matrix && docker compose up -d web", "Recreate web container")
        
        # Wait and check status
        print("\n>>> Waiting 5 seconds...")
        time.sleep(5)
        
        run_command(ssh, "cd /opt/tg-matrix && docker compose ps", "Check container status")
        run_command(ssh, "cd /opt/tg-matrix && docker compose logs --tail=10 web", "Check nginx logs")
        
        # Test HTTPS
        run_command(ssh, "curl -s -k https://localhost/health", "Test HTTPS localhost")
        run_command(ssh, "curl -s -k https://tgw.usdt2026.cc/health", "Test HTTPS domain")
        run_command(ssh, "curl -s http://localhost/health", "Test HTTP localhost")
        
        print(f"\n{'='*60}")
        print("COMPLETED")
        print('='*60)
        
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        ssh.close()

if __name__ == "__main__":
    main()
