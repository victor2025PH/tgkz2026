#!/usr/bin/env python3
"""
TG-Matrix Python 後端打包腳本
將 Python 後端編譯為獨立 exe 文件
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# 項目路徑
PROJECT_ROOT = Path(__file__).parent.parent
BACKEND_DIR = PROJECT_ROOT / 'backend'
BUILD_DIR = PROJECT_ROOT / 'build-python'
DIST_DIR = PROJECT_ROOT / 'dist-backend'

def clean_build():
    """清理之前的構建文件"""
    print("[CLEAN] Cleaning old build files...")
    
    dirs_to_clean = [BUILD_DIR, DIST_DIR]
    for dir_path in dirs_to_clean:
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"  [OK] Deleted: {dir_path}")
    
    # 清理 .spec 文件
    for spec_file in PROJECT_ROOT.glob('*.spec'):
        spec_file.unlink()
        print(f"  [OK] Deleted: {spec_file}")


def install_pyinstaller():
    """確保 PyInstaller 已安裝"""
    print("[CHECK] Checking PyInstaller...")
    try:
        import PyInstaller
        print(f"  [OK] PyInstaller version: {PyInstaller.__version__}")
    except ImportError:
        print("  [WARN] PyInstaller not installed, installing...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
        print("  [OK] PyInstaller installed")


def create_spec_file():
    """創建 PyInstaller spec 文件"""
    print("[SPEC] Creating PyInstaller spec file...")
    
    # 收集所有需要的模塊
    hidden_imports = [
        # Pyrogram 相關
        'pyrogram',
        'pyrogram.raw',
        'pyrogram.raw.all',
        'pyrogram.raw.base',
        'pyrogram.raw.functions',
        'pyrogram.raw.types',
        'pyrogram.handlers',
        'pyrogram.types',
        'pyrogram.errors',
        'pyrogram.crypto',
        'tgcrypto',
        
        # Telethon 相關 (QR 碼登入)
        'telethon',
        'telethon.client',
        'telethon.sessions',
        'telethon.sessions.string',
        'telethon.errors',
        'telethon.tl',
        'telethon.tl.functions',
        'telethon.tl.functions.auth',
        'telethon.tl.types',
        'telethon.tl.types.auth',
        'telethon.crypto',
        
        # QR 碼生成
        'qrcode',
        'qrcode.main',
        'qrcode.image',
        'qrcode.image.pil',
        'qrcode.image.base',
        'qrcode.constants',
        
        # Pillow (QR 碼圖片處理)
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        
        # SOCKS 代理支持
        'socks',
        'pysocks',
        
        # 數據庫
        'aiosqlite',
        'sqlite3',
        
        # 網絡
        'aiohttp',
        'aiohttp.web',
        
        # AI 相關（可選）
        'sentence_transformers',
        'chromadb',
        'torch',
        'transformers',
        
        # 標準庫
        'asyncio',
        'json',
        'typing',
        'datetime',
        'pathlib',
        'hashlib',
        'uuid',
        'random',
        'time',
        're',
        'os',
        'sys',
        'gc',
        'traceback',
        'logging',
        'collections',
        'functools',
        'itertools',
        
        # 其他
        'httpx',
        'socksio',
        'python_socks',
        
        # Playwright (API 憑據抓取)
        'playwright',
        'playwright.async_api',
    ]
    
    # 收集後端所有 Python 文件作為數據
    backend_files = list(BACKEND_DIR.glob('*.py'))
    datas = []
    for f in backend_files:
        if f.name != 'main.py':  # main.py 是入口
            datas.append((str(f), '.'))
    
    # 添加 config 目錄（如果存在）
    config_dir = BACKEND_DIR / 'config'
    if config_dir.exists():
        datas.append((str(config_dir), 'config'))
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-
# TG-Matrix Backend PyInstaller Spec

import sys
from pathlib import Path

block_cipher = None

# 後端路徑
backend_path = Path(r'{BACKEND_DIR}')

a = Analysis(
    [str(backend_path / 'main.py')],
    pathex=[str(backend_path)],
    binaries=[],
    datas=[
        # 包含默認配置
        (str(Path(r'{PROJECT_ROOT}') / 'default-config'), 'default-config'),
    ],
    hiddenimports={hidden_imports},
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy.testing',
        'scipy',
        # 'PIL',  # 需要 PIL 來生成 QR 碼圖片
        'tkinter',
        'test',
        'unittest',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 過濾不需要的二進制文件（減小體積）
excluded_binaries = [
    'api-ms-',
    'ucrtbase',
    'd3dcompiler',
    'opengl32',
]
a.binaries = [x for x in a.binaries if not any(ex in x[0].lower() for ex in excluded_binaries)]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='tg-matrix-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # 後端需要控制台用於 stdin/stdout 通信
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    spec_path = PROJECT_ROOT / 'tg-matrix-backend.spec'
    spec_path.write_text(spec_content, encoding='utf-8')
    print(f"  [OK] Created: {spec_path}")
    return spec_path


def run_pyinstaller(spec_path):
    """運行 PyInstaller"""
    print("[COMPILE] Compiling Python backend...")
    print("  [WAIT] This may take a few minutes, please wait...")
    
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        '--distpath', str(DIST_DIR),
        '--workpath', str(BUILD_DIR),
        '--log-level', 'WARN',
        str(spec_path)
    ]
    
    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    
    if result.returncode != 0:
        print("[ERROR] PyInstaller compilation failed!")
        return False
    
    print("[SUCCESS] PyInstaller compilation completed!")
    return True


def copy_to_release():
    """複製編譯結果到 release 目錄"""
    print("[COPY] Copying compiled files...")
    
    exe_path = DIST_DIR / 'tg-matrix-backend.exe'
    if not exe_path.exists():
        print(f"  [ERROR] Not found: {exe_path}")
        return False
    
    # 複製到 backend-exe 目錄
    target_dir = PROJECT_ROOT / 'backend-exe'
    target_dir.mkdir(exist_ok=True)
    
    target_exe = target_dir / 'tg-matrix-backend.exe'
    shutil.copy2(exe_path, target_exe)
    
    # 獲取文件大小
    size_mb = target_exe.stat().st_size / (1024 * 1024)
    print(f"  [OK] Copied: {target_exe}")
    print(f"  [OK] File size: {size_mb:.1f} MB")
    
    return True


def create_sessions_dir():
    """創建必要的目錄結構"""
    print("[DIR] Creating directory structure...")
    
    dirs = [
        PROJECT_ROOT / 'backend-exe' / 'sessions',
        PROJECT_ROOT / 'backend-exe' / 'data',
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        print(f"  [OK] Created: {d}")


def main():
    """主函數"""
    # 設置輸出編碼
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("[BUILD] TG-Matrix Python Backend Compilation")
    print("   Compiling Python to standalone exe")
    print("=" * 60)
    print()
    
    # 執行步驟
    clean_build()
    install_pyinstaller()
    spec_path = create_spec_file()
    
    if not run_pyinstaller(spec_path):
        print("\n[ERROR] Compilation failed, please check error messages")
        sys.exit(1)
    
    if not copy_to_release():
        print("\n[ERROR] Copy failed")
        sys.exit(1)
    
    create_sessions_dir()
    
    print()
    print("=" * 60)
    print("[SUCCESS] Compilation completed!")
    print()
    print("[OUTPUT] Output file:")
    print(f"   {PROJECT_ROOT / 'backend-exe' / 'tg-matrix-backend.exe'}")
    print()
    print("[NEXT] Next steps:")
    print("   1. 運行 npm run dist:win 打包完整安裝程序")
    print("=" * 60)


if __name__ == '__main__':
    main()
