#!/usr/bin/env python3
"""
一次性脚本：将 Blurpath 新购的 2 个 IP 加入代理池。
代理信息来自 Blurpath 代理列表（菲律賓，全局账户 twzbri8wwix）。

本地运行（项目根目录）: python scripts/add_blurpath_proxies.py
容器内运行: docker exec api python /tmp/add_blurpath_proxies.py (需先将脚本拷入容器)
"""
import sys
import os

# 共 3 个 Blurpath 静态 ISP 代理（菲律賓，全局账户 twzbri8wwix）
PROXIES = [
    "socks5://twzbri8wwix:jTNSrKhQdz3Hgbojf@103.92.145.52:2340",
    "socks5://twzbri8wwix:jTNSrKhQdz3Hgbojf@195.86.175.198:2340",
    "socks5://twzbri8wwix:jTNSrKhQdz3Hgbojf@195.86.175.124:2340",
]


def main():
    # 支持在项目根目录运行（backend 在 backend/）或容器内运行（/app = backend）
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(root, "backend")
    if os.path.isdir(backend_dir):
        sys.path.insert(0, root)
        os.chdir(backend_dir)
        from backend.admin.proxy_pool import get_proxy_pool
    else:
        # 容器内: 脚本在 /tmp，/app 为 backend
        sys.path.insert(0, "/app")
        os.chdir("/app")
        from admin.proxy_pool import get_proxy_pool

    pool = get_proxy_pool()
    result = pool.add_proxies_batch(PROXIES)
    print(f"添加结果: 成功 {result['success']}, 失败 {result['failed']}")
    if result.get("errors"):
        for e in result["errors"]:
            print(f"  - {e}")
    return 0 if result["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
