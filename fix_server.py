#!/usr/bin/env python3
"""修復服務器"""

import paramiko

HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run(ssh, cmd, sudo=False):
    if sudo:
        cmd = f"echo '{PASSWORD}' | sudo -S bash -c '{cmd}'"
    print(f">>> {cmd[:100]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    for line in out.split('\n'):
        if line.strip() and '[sudo]' not in line:
            print(line)
    if err and 'password' not in err.lower() and 'warning' not in err.lower():
        for line in err.split('\n')[:5]:
            if line.strip():
                print(f"ERR: {line}")
    return stdout.channel.recv_exit_status()

def main():
    print("連接服務器...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("已連接！\n")
    
    # 檢查 Docker 狀態
    print("=== 檢查 Docker 狀態 ===")
    run(ssh, "docker ps -a", sudo=True)
    
    # 檢查日誌
    print("\n=== 檢查容器日誌 ===")
    run(ssh, "cd /opt/tg-matrix && docker compose logs --tail 20", sudo=True)
    
    # 重啟服務
    print("\n=== 重啟服務 ===")
    run(ssh, "cd /opt/tg-matrix && docker compose up -d", sudo=True)
    
    # 再次檢查
    print("\n=== 檢查運行狀態 ===")
    run(ssh, "docker ps", sudo=True)
    
    # 測試
    print("\n=== 測試連接 ===")
    run(ssh, "sleep 3 && curl -s http://localhost:80/health || curl -s http://localhost:8000/health")
    
    ssh.close()
    print("\n完成！")

if __name__ == "__main__":
    main()
