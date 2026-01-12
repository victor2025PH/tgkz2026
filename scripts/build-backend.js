/**
 * Build script for Python backend using PyInstaller
 * This creates a standalone executable for the Python backend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');
const mainPy = path.join(backendDir, 'main.py');
const distPath = path.join(__dirname, '..', 'release', 'backend');

console.log('Building Python backend with PyInstaller...');
console.log('Backend directory:', backendDir);
console.log('Main script:', mainPy);
console.log('Output directory:', distPath);

// Check if PyInstaller is installed
const checkPyInstaller = spawn('pip', ['show', 'pyinstaller'], {
    stdio: 'pipe',
    shell: true
});

checkPyInstaller.on('close', (code) => {
    if (code !== 0) {
        console.log('PyInstaller not found. Installing...');
        const installPyInstaller = spawn('pip', ['install', 'pyinstaller'], {
            stdio: 'inherit',
            shell: true
        });
        
        installPyInstaller.on('close', (installCode) => {
            if (installCode === 0) {
                buildBackend();
            } else {
                console.error('Failed to install PyInstaller');
                process.exit(1);
            }
        });
    } else {
        buildBackend();
    }
});

function buildBackend() {
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
    }
    
    // PyInstaller command
    const pyInstallerArgs = [
        mainPy,
        '--name=tg-matrix-backend',
        '--onefile',
        '--clean',
        `--distpath=${distPath}`,
        `--workpath=${path.join(distPath, 'build')}`,
        '--hidden-import=pyrogram',
        '--hidden-import=aiosqlite',
        '--hidden-import=openpyxl',
        '--hidden-import=cryptography',
        '--hidden-import=psutil',
        '--hidden-import=PyYAML',
        '--collect-all=pyrogram',
        '--collect-all=aiosqlite',
        '--add-data=backend/config.yaml;backend',
        '--add-data=backend/requirements.txt;backend'
    ];
    
    console.log('Running PyInstaller...');
    console.log('Command: pyinstaller', pyInstallerArgs.join(' '));
    
    const pyInstaller = spawn('pyinstaller', pyInstallerArgs, {
        cwd: backendDir,
        stdio: 'inherit',
        shell: true
    });
    
    pyInstaller.on('close', (code) => {
        if (code === 0) {
            console.log('Python backend built successfully!');
            console.log('Executable location:', path.join(distPath, process.platform === 'win32' ? 'tg-matrix-backend.exe' : 'tg-matrix-backend'));
        } else {
            console.error('PyInstaller build failed with code:', code);
            process.exit(1);
        }
    });
    
    pyInstaller.on('error', (error) => {
        console.error('Failed to start PyInstaller:', error);
        process.exit(1);
    });
}

