/**
 * Script to create placeholder icons if they don't exist
 * This is a helper script for development
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');

// Create build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

console.log('📝 Icon placeholder script');
console.log('This script helps you understand what icon files are needed.\n');

const iconFiles = {
    win: path.join(buildDir, 'icon.ico'),
    mac: path.join(buildDir, 'icon.icns'),
    linux: path.join(buildDir, 'icon.png')
};

console.log('Required icon files:');
console.log(`  Windows: ${iconFiles.win}`);
console.log(`  macOS:   ${iconFiles.mac}`);
console.log(`  Linux:   ${iconFiles.linux}\n`);

let missingIcons = [];

if (!fs.existsSync(iconFiles.win)) {
    missingIcons.push('Windows (icon.ico)');
}
if (!fs.existsSync(iconFiles.mac)) {
    missingIcons.push('macOS (icon.icns)');
}
if (!fs.existsSync(iconFiles.linux)) {
    missingIcons.push('Linux (icon.png)');
}

if (missingIcons.length > 0) {
    console.log('⚠️  Missing icon files:');
    missingIcons.forEach(icon => console.log(`  - ${icon}`));
    console.log('\n📖 How to create icons:');
    console.log('  1. Prepare a 512x512 PNG image with your logo');
    console.log('  2. Convert to required formats:');
    console.log('     - Windows: Use https://convertio.co/png-ico/');
    console.log('     - macOS:   Use https://cloudconvert.com/png-to-icns');
    console.log('     - Linux:   Use the PNG directly');
    console.log('\n💡 Note: Electron Builder will use default icons if these files are missing.');
} else {
    console.log('✅ All icon files are present!');
}

