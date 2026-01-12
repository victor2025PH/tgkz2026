#!/usr/bin/env python3
"""
TG-Matrix Python 後端打包腳本
使用 PyInstaller 將 Python 後端打包成可執行文件
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# 項目根目錄
PROJECT_ROOT = Path(__file__).parent.parent
BACKEND_DIR = PROJECT_ROOT / 'backend'
BUILD_DIR = PROJECT_ROOT / 'build'
DIST_DIR = PROJECT_ROOT / 'dist-python'

# 需要排除的模塊（減小包大小）
EXCLUDED_MODULES = [
    'matplotlib',
    'numpy',
    'pandas',
    'scipy',
    'PIL',
    'tkinter',
    'test',
    'unittest',
]

# 需要包含的數據文件
DATA_FILES = [
    # (源文件, 目標目錄)
]

# 隱藏導入（PyInstaller 可能無法自動檢測）
HIDDEN_IMPORTS = [
    'pyrogram',
    'pyrogram.raw',
    'pyrogram.raw.all',
    'tgcrypto',
    'aiosqlite',
    'aiohttp',
    'chromadb',
    'sentence_transformers',
    'torch',
    'transformers',
]


def clean_build():
    """清理之前的構建文件"""
    print("🧹 清理舊的構建文件...")
    
    dirs_to_clean = [
        BUILD_DIR,
        DIST_DIR,
        BACKEND_DIR / '__pycache__',
        BACKEND_DIR / 'build',
        BACKEND_DIR / 'dist',
    ]
    
    for dir_path in dirs_to_clean:
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"  ✓ 已刪除: {dir_path}")
    
    # 清理 .pyc 文件
    for pyc_file in BACKEND_DIR.rglob('*.pyc'):
        pyc_file.unlink()
    
    # 清理 .spec 文件
    for spec_file in PROJECT_ROOT.glob('*.spec'):
        spec_file.unlink()
        print(f"  ✓ 已刪除: {spec_file}")


def create_spec_file():
    """創建 PyInstaller spec 文件"""
    print("📝 創建 PyInstaller spec 文件...")
    
    spec_content = f'''# -*- mode: python ; coding: utf-8 -*-
# TG-Matrix Backend PyInstaller Spec File

import sys
from pathlib import Path

block_cipher = None

# 項目路徑
backend_path = Path(r'{BACKEND_DIR}')

# 分析腳本
a = Analysis(
    [str(backend_path / 'main.py')],
    pathex=[str(backend_path)],
    binaries=[],
    datas=[
        # 包含默認配置
        (str(Path(r'{PROJECT_ROOT}') / 'default-config'), 'default-config'),
    ],
    hiddenimports={HIDDEN_IMPORTS},
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes={EXCLUDED_MODULES},
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 過濾不需要的二進制文件
a.binaries = [x for x in a.binaries if not x[0].startswith('api-ms-')]

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
    console=True,  # 後端需要控制台輸出
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(Path(r'{PROJECT_ROOT}') / 'build-resources' / 'icon.ico') if (Path(r'{PROJECT_ROOT}') / 'build-resources' / 'icon.ico').exists() else None,
)
'''
    
    spec_path = PROJECT_ROOT / 'tg-matrix-backend.spec'
    spec_path.write_text(spec_content, encoding='utf-8')
    print(f"  ✓ 已創建: {spec_path}")
    return spec_path


def run_pyinstaller(spec_path):
    """運行 PyInstaller"""
    print("🔨 運行 PyInstaller...")
    
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--clean',
        '--noconfirm',
        '--distpath', str(DIST_DIR),
        '--workpath', str(BUILD_DIR),
        str(spec_path)
    ]
    
    print(f"  命令: {' '.join(cmd)}")
    
    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    
    if result.returncode != 0:
        print("❌ PyInstaller 構建失敗!")
        sys.exit(1)
    
    print("✅ PyInstaller 構建成功!")


def copy_additional_files():
    """複製額外需要的文件"""
    print("📁 複製額外文件...")
    
    # 創建空的數據目錄
    data_dir = DIST_DIR / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # 創建 README
    readme_content = """# TG-Matrix 數據目錄

此目錄用於存儲用戶數據，包括：
- 數據庫文件 (*.db)
- Telegram 會話文件 (sessions/)
- 知識庫數據 (chroma_db/)
- 日誌文件 (*.log)

⚠️ 請勿手動刪除此目錄中的文件，除非您確定要清除所有數據。
"""
    
    (data_dir / 'README.txt').write_text(readme_content, encoding='utf-8')
    print(f"  ✓ 已創建: {data_dir / 'README.txt'}")


def verify_build():
    """驗證構建結果"""
    print("🔍 驗證構建結果...")
    
    exe_path = DIST_DIR / 'tg-matrix-backend.exe'
    if sys.platform != 'win32':
        exe_path = DIST_DIR / 'tg-matrix-backend'
    
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ 可執行文件: {exe_path}")
        print(f"  ✓ 文件大小: {size_mb:.2f} MB")
        return True
    else:
        print(f"  ❌ 未找到可執行文件: {exe_path}")
        return False


def main():
    """主函數"""
    print("=" * 60)
    print("🚀 TG-Matrix Python 後端打包")
    print("=" * 60)
    
    # 檢查 PyInstaller
    try:
        import PyInstaller
        print(f"✓ PyInstaller 版本: {PyInstaller.__version__}")
    except ImportError:
        print("❌ PyInstaller 未安裝，正在安裝...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])
    
    # 執行構建步驟
    clean_build()
    spec_path = create_spec_file()
    run_pyinstaller(spec_path)
    copy_additional_files()
    
    if verify_build():
        print("\n" + "=" * 60)
        print("✅ 構建完成!")
        print(f"📦 輸出目錄: {DIST_DIR}")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ 構建失敗!")
        print("=" * 60)
        sys.exit(1)


if __name__ == '__main__':
    main()
