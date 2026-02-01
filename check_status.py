import paramiko

HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)

print("=== Container Logs ===")
stdin, stdout, stderr = ssh.exec_command("docker logs tg-matrix-api-1 --tail 30 2>&1")
print(stdout.read().decode())

print("\n=== Port Status ===")
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep -E '80|8000'")
print(stdout.read().decode())

print("\n=== Docker Status ===")
stdin, stdout, stderr = ssh.exec_command("docker ps")
print(stdout.read().decode())

ssh.close()
