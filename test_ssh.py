import paramiko
import sys

HOST = "165.154.210.154"
USER = "root"
PASSWORD = "9SfkPg4GRWf7DM8P"

print(f"Testing SSH to {HOST}")
print(f"User: {USER}")
print(f"Password: {PASSWORD}")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    # Enable debug logging
    paramiko.util.log_to_file("paramiko.log")
    
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
    stdin, stdout, stderr = ssh.exec_command("whoami && hostname")
    print(f"Output: {stdout.read().decode()}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
finally:
    ssh.close()
