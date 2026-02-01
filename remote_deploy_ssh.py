#!/usr/bin/env python3
"""SSH deployment script for TG-Matrix server"""

import paramiko
import time
import sys
import json

# Server configuration
HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run_command(ssh, command, timeout=120):
    """Run a command and return output"""
    print(f"\n{'='*60}")
    print(f"Running: {command}")
    print('='*60)
    
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    
    if output:
        print(output)
    if error:
        print(f"STDERR: {error}")
    print(f"Exit code: {exit_code}")
    
    return output, error, exit_code

def main():
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {HOST}...")
    try:
        ssh.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("Connected successfully!")
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)
    
    try:
        # Step 1: Pull latest code
        print("\n" + "="*70)
        print("STEP 1: Pull latest code")
        print("="*70)
        output, error, code = run_command(ssh, 
            "cd /opt/tg-matrix && git fetch origin && git reset --hard origin/main && git log -1 --format='%h %s'")
        
        # Verify commit
        if "a5c8c32" in output:
            print("✓ Commit a5c8c32 verified!")
        else:
            print(f"⚠ Expected commit a5c8c32, got: {output.strip()}")
        
        # Step 2: Check if api_credentials.json exists
        print("\n" + "="*70)
        print("STEP 2: Check if api_credentials.json exists")
        print("="*70)
        output, error, code = run_command(ssh,
            "cat /opt/tg-matrix/data/api_credentials.json 2>/dev/null || echo 'File not found'")
        
        file_exists = "File not found" not in output
        
        # Step 3: Create file if not found
        if not file_exists:
            print("\n" + "="*70)
            print("STEP 3: Creating api_credentials.json")
            print("="*70)
            
            credentials = {
                "credentials": [
                    {
                        "api_id": "21825589",
                        "api_hash": "a455eb79a2b8e8f7a3d30ef3f7fa0c79",
                        "name": "Test API",
                        "source": "my.telegram.org",
                        "created_at": "2026-01-31",
                        "is_active": True,
                        "account_count": 0,
                        "max_accounts": 5,
                        "is_public": False
                    }
                ]
            }
            json_content = json.dumps(credentials, indent=2)
            
            # Ensure data directory exists and write file
            run_command(ssh, "mkdir -p /opt/tg-matrix/data")
            run_command(ssh, f"cat > /opt/tg-matrix/data/api_credentials.json << 'EOFCRED'\n{json_content}\nEOFCRED")
            
            # Verify file was created
            output, error, code = run_command(ssh, "cat /opt/tg-matrix/data/api_credentials.json")
        else:
            print("\n" + "="*70)
            print("STEP 3: File already exists, skipping creation")
            print("="*70)
        
        # Step 4: Rebuild and restart API
        print("\n" + "="*70)
        print("STEP 4: Rebuild and restart API")
        print("="*70)
        output, error, code = run_command(ssh, 
            "cd /opt/tg-matrix && docker compose build api && docker compose restart api",
            timeout=300)
        
        # Step 5: Wait 15 seconds
        print("\n" + "="*70)
        print("STEP 5: Waiting 15 seconds for API to start...")
        print("="*70)
        time.sleep(15)
        print("Done waiting.")
        
        # Step 6: Test get-api-credentials command
        print("\n" + "="*70)
        print("STEP 6: Test get-api-credentials command")
        print("="*70)
        output, error, code = run_command(ssh,
            '''curl -s -X POST http://localhost:8000/api/command -H "Content-Type: application/json" -d '{"command": "get-api-credentials", "payload": {}}' ''')
        
        # Parse and display response
        try:
            response = json.loads(output)
            print("\nParsed response:")
            print(json.dumps(response, indent=2))
        except:
            print(f"\nRaw response: {output}")
        
        # Step 7: Check container status
        print("\n" + "="*70)
        print("STEP 7: Check container status")
        print("="*70)
        output, error, code = run_command(ssh, "cd /opt/tg-matrix && docker compose ps")
        
        print("\n" + "="*70)
        print("DEPLOYMENT COMPLETE")
        print("="*70)
        
    finally:
        ssh.close()
        print("\nSSH connection closed.")

if __name__ == "__main__":
    main()
