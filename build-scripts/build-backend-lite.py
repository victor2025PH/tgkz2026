#!/usr/bin/env python3
"""
TG-Matrix Python 後端打包腳本（輕量版）
不包含 AI 模塊，打包更快更小
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
    print("🧹 清理舊的構建文件...")
    
    dirs_to_clean = [BUILD_DIR, DIST_DIR]
    for dir_path in dirs_to_clean:
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"  ✓ 已刪除: {dir_path}")
    
    # 清理 .spec 文件
    for spec_file in PROJECT_ROOT.glob('*.spec'):
        spec_file.unlink()
        print(f"  ✓ 已刪除: {spec_file}")


def install_pyinstaller():
    """確保 PyInstaller 已安裝"""
    print("📦 檢查 PyInstaller...")
    try:
        import PyInstaller
        print(f"  ✓ PyInstaller 版本: {PyInstaller.__version__}")
    except ImportError:
        print("  ⚠️ PyInstaller 未安裝，正在安裝...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'], check=True)
        print("  ✓ PyInstaller 安裝完成")


def create_spec_file():
    """創建 PyInstaller spec 文件（輕量版）"""
    print("📝 創建 PyInstaller spec 文件（輕量版）...")
    
    # 輕量版：只包含核心功能，不包含 AI 模塊
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
        
        # 數據庫
        'aiosqlite',
        'sqlite3',
        
        # 網絡
        'aiohttp',
        'aiohttp.web',
        
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
    ]
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-
# TG-Matrix Backend PyInstaller Spec (Lite Version)

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
        # 排除 AI 模塊（大幅減小體積）
        'torch',
        'torchvision',
        'torchaudio',
        'transformers',
        'sentence_transformers',
        'chromadb',
        'playwright',
        
        # 排除其他不需要的
        'matplotlib',
        'numpy.testing',
        'scipy',
        'tkinter',
        'test',
        'unittest',
        'pytest',
        'IPython',
        'jupyter',
        'notebook',
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
    'libopenblas',
    'mkl_',
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
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    spec_path = PROJECT_ROOT / 'tg-matrix-backend-lite.spec'
    spec_path.write_text(spec_content, encoding='utf-8')
    print(f"  ✓ 已創建: {spec_path}")
    return spec_path


def run_pyinstaller(spec_path):
    """運行 PyInstaller"""
    print("🔨 編譯 Python 後端（輕量版）...")
    print("  ⏳ 這大約需要 3-5 分鐘...")
    
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
        print("❌ PyInstaller 編譯失敗!")
        return False
    
    print("✅ PyInstaller 編譯成功!")
    return True


def copy_to_release():
    """複製編譯結果到 release 目錄"""
    print("📁 複製編譯結果...")
    
    exe_path = DIST_DIR / 'tg-matrix-backend.exe'
    if not exe_path.exists():
        print(f"  ❌ 未找到: {exe_path}")
        return False
    
    # 複製到 backend-exe 目錄
    target_dir = PROJECT_ROOT / 'backend-exe'
    target_dir.mkdir(exist_ok=True)
    
    target_exe = target_dir / 'tg-matrix-backend.exe'
    shutil.copy2(exe_path, target_exe)
    
    # 獲取文件大小
    size_mb = target_exe.stat().st_size / (1024 * 1024)
    print(f"  ✓ 已複製: {target_exe}")
    print(f"  ✓ 文件大小: {size_mb:.1f} MB")
    
    return True


def create_sessions_dir():
    """創建必要的目錄結構"""
    print("📁 創建目錄結構...")
    
    dirs = [
        PROJECT_ROOT / 'backend-exe' / 'sessions',
        PROJECT_ROOT / 'backend-exe' / 'data',
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ 創建: {d}")


def main():
    """主函數"""
    print("=" * 60)
    print("🚀 TG-Matrix Python 後端編譯（輕量版）")
    print("   不包含 AI 模塊，打包更快更小")
    print("=" * 60)
    print()
    
    # 執行步驟
    clean_build()
    install_pyinstaller()
    spec_path = create_spec_file()
    
    if not run_pyinstaller(spec_path):
        print("\n❌ 編譯失敗，請檢查錯誤信息")
        sys.exit(1)
    
    if not copy_to_release():
        print("\n❌ 複製失敗")
        sys.exit(1)
    
    create_sessions_dir()
    
    print()
    print("=" * 60)
    print("✅ 輕量版編譯完成!")
    print()
    print("📦 輸出文件:")
    print(f"   {PROJECT_ROOT / 'backend-exe' / 'tg-matrix-backend.exe'}")
    print()
    print("💡 注意：此版本不包含 AI 功能（RAG、知識庫等）")
    print("   如需 AI 功能，請使用完整版打包")
    print()
    print("📋 下一步:")
    print("   運行 npm run dist:win 打包完整安裝程序")
    print("=" * 60)


if __name__ == '__main__':
    main()
