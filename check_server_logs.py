#!/usr/bin/env python3
"""SSH 到服務器查看部署日誌和診斷問題"""

import paramiko
import sys

HOST = "165.154.210.154"
USERNAME = "ubuntu"
PASSWORD = "TgMatrix2026!"
DEPLOY_PATH = "/opt/tg-matrix"

def run_cmd(client, cmd, desc):
    print(f"\n{'='*70}")
    print(f"  {desc}")
    print('='*70)
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print(out if out else "(無輸出)")
        if err:
            print("STDERR:", err)
    except Exception as e:
        print(f"執行失敗: {e}")

def main():
    print(f"正在連接到 {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(HOST, username=USERNAME, password=PASSWORD, timeout=30)
        print("連接成功!\n")
    except Exception as e:
        print(f"連接失敗: {e}")
        sys.exit(1)
    
    try:
        run_cmd(client, f"cd {DEPLOY_PATH} && sudo docker compose ps -a", "1. Docker 容器狀態")
        run_cmd(client, f"cd {DEPLOY_PATH} && sudo docker compose logs api --tail=100", "2. API 容器最近日誌 (最後 100 行)")
        run_cmd(client, f"cd {DEPLOY_PATH} && sudo docker compose logs web --tail=50", "3. Web/Nginx 容器最近日誌")
        run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health 2>/dev/null || echo 'API 無法連接'", "4. API 健康檢查 (localhost:8000)")
        run_cmd(client, "curl -s http://localhost:8000/health 2>/dev/null || echo '(失敗)'", "5. API 健康檢查響應內容")
        run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health 2>/dev/null || echo 'Nginx->API 無法連接'", "6. Nginx 代理 /api/health 狀態碼")
        run_cmd(client, "curl -s http://localhost/api/health 2>/dev/null | head -5 || echo '(失敗)'", "7. Nginx 代理 /api/health 響應")
        run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/v1/auth/me 2>/dev/null", "8. /api/v1/auth/me 狀態碼 (無 Token)")
        run_cmd(client, f"ls -la {DEPLOY_PATH}/dist/ 2>/dev/null | head -15", "9. 前端 dist 目錄是否存在")
        run_cmd(client, f"sudo docker images | head -10", "10. Docker 鏡像列表")
        run_cmd(client, f"cd {DEPLOY_PATH} && sudo docker compose config 2>&1 | head -30", "11. Docker Compose 配置檢查")
    finally:
        client.close()
    
    print("\n" + "="*70)
    print("  診斷完成")
    print("="*70)

if __name__ == "__main__":
    main()
