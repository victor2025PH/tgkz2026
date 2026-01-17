# -*- mode: python ; coding: utf-8 -*-
# TG-Matrix Backend PyInstaller Spec (Lite Version)

import sys
from pathlib import Path

block_cipher = None

# 後端路徑
backend_path = Path(r'C:\tgkz2026\backend')

a = Analysis(
    [str(backend_path / 'main.py')],
    pathex=[str(backend_path)],
    binaries=[],
    datas=[
        # 包含默認配置
        (str(Path(r'C:\tgkz2026') / 'default-config'), 'default-config'),
    ],
    hiddenimports=['pyrogram', 'pyrogram.raw', 'pyrogram.raw.all', 'pyrogram.raw.base', 'pyrogram.raw.functions', 'pyrogram.raw.types', 'pyrogram.handlers', 'pyrogram.types', 'pyrogram.errors', 'pyrogram.crypto', 'tgcrypto', 'telethon', 'telethon.client', 'telethon.sessions', 'telethon.sessions.string', 'telethon.errors', 'telethon.tl', 'telethon.tl.functions', 'telethon.tl.functions.auth', 'telethon.tl.types', 'telethon.tl.types.auth', 'telethon.crypto', 'qrcode', 'qrcode.main', 'qrcode.image', 'qrcode.image.pil', 'qrcode.image.base', 'qrcode.constants', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'socks', 'aiosqlite', 'sqlite3', 'aiohttp', 'aiohttp.web', 'asyncio', 'json', 'typing', 'datetime', 'pathlib', 'hashlib', 'uuid', 'random', 'time', 're', 'os', 'sys', 'gc', 'traceback', 'logging', 'collections', 'functools', 'itertools', 'httpx', 'socksio', 'python_socks'],
    hookspath=[],
    hooksconfig={},
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
