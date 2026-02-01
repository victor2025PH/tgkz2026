#!/usr/bin/env python3
"""快速部署腳本 - 拉取代碼並重啟服務"""

import paramiko
import sys

HOST = "165.154.210.154"
USER = "ubuntu"
PASSWORD = "TgMatrix2026!"

def run(ssh, cmd, sudo=False):
    """執行命令"""
    if sudo:
        cmd = f"echo '{PASSWORD}' | sudo -S bash -c '{cmd}'"
    print(f">>> {cmd[:100]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    for line in out.split('\n'):
        if line.strip() and '[sudo]' not in line:
            print(line)
    return stdout.channel.recv_exit_status()

def main():
    print("=" * 50)
    print("  快速部署 TG-Matrix")
    print("=" * 50)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"\n連接到 {HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    print("連接成功！")
    
    # 拉取最新代碼
    print("\n[1/4] 拉取最新代碼...")
    run(ssh, "cd /opt/tg-matrix && git pull origin main")
    
    # 更新 web_server.py
    print("\n[2/4] 更新後端...")
    run(ssh, "cd /opt/tg-matrix && cat backend/web_server.py | head -20")
    
    # 重啟服務
    print("\n[3/4] 重啟 Docker 服務...")
    run(ssh, "cd /opt/tg-matrix && docker compose down", sudo=True)
    run(ssh, "cd /opt/tg-matrix && docker compose build --no-cache api", sudo=True)
    run(ssh, "cd /opt/tg-matrix && docker compose up -d", sudo=True)
    
    # 檢查狀態
    print("\n[4/4] 檢查服務狀態...")
    run(ssh, "docker ps", sudo=True)
    
    # 測試 API
    print("\n測試 API...")
    run(ssh, "sleep 5 && curl -s http://localhost:8000/health")
    
    ssh.close()
    print("\n" + "=" * 50)
    print("  部署完成！")
    print("  訪問: http://165.154.210.154")
    print("=" * 50)

if __name__ == "__main__":
    main()
