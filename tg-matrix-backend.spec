# -*- mode: python ; coding: utf-8 -*-
# TG-Matrix Backend PyInstaller Spec

import sys
from pathlib import Path

block_cipher = None

# 後端路徑
backend_path = Path(r'D:\tgkz2026\backend')

a = Analysis(
    [str(backend_path / 'main.py')],
    pathex=[str(backend_path)],
    binaries=[],
    datas=[
        # 包含默認配置
        (str(Path(r'D:\tgkz2026') / 'default-config'), 'default-config'),
    ],
    # 🔧 Phase 3 優化：移除重量級 AI 依賴以節省內存和縮小體積
    # sentence_transformers, chromadb, torch, transformers 已移除
    # 這些功能在輕量模式下使用簡單嵌入替代
    hiddenimports=['pyrogram', 'pyrogram.raw', 'pyrogram.raw.all', 'pyrogram.raw.base', 'pyrogram.raw.functions', 'pyrogram.raw.types', 'pyrogram.handlers', 'pyrogram.types', 'pyrogram.errors', 'pyrogram.crypto', 'tgcrypto', 'telethon', 'telethon.client', 'telethon.sessions', 'telethon.sessions.string', 'telethon.errors', 'telethon.tl', 'telethon.tl.functions', 'telethon.tl.functions.auth', 'telethon.tl.types', 'telethon.tl.types.auth', 'telethon.crypto', 'qrcode', 'qrcode.main', 'qrcode.image', 'qrcode.image.pil', 'qrcode.image.base', 'qrcode.constants', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'socks', 'pysocks', 'aiosqlite', 'sqlite3', 'aiohttp', 'aiohttp.web', 'asyncio', 'json', 'typing', 'datetime', 'pathlib', 'hashlib', 'uuid', 'random', 'time', 're', 'os', 'sys', 'gc', 'traceback', 'logging', 'collections', 'functools', 'itertools', 'httpx', 'socksio', 'python_socks', 'numpy', 'psutil'],
    hookspath=[],
    hooksconfig={},
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
        # 🔧 Phase 3 優化：排除重量級 AI 依賴（節省 ~500MB）
        'torch',
        'torchvision',
        'torchaudio',
        'transformers',
        'sentence_transformers',
        'chromadb',
        'huggingface_hub',
        'tokenizers',
        'safetensors',
        # 排除不需要的 playwright（如果不用於爬蟲）
        'playwright',
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
