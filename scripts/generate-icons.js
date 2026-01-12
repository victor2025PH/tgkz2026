/**
 * TG-Matrix Icon Generator
 * Generates app icons for all platforms
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requirements:
 * - npm install canvas png-to-ico  (for programmatic generation)
 * - Or use an online tool to convert PNG to ICO/ICNS
 */

const fs = require('fs');
const path = require('path');

// Icon output directory
const BUILD_RESOURCES = path.join(__dirname, '..', 'build-resources');
const ICONS_DIR = path.join(BUILD_RESOURCES, 'icons');

// Ensure directories exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

/**
 * Generate a simple SVG icon for TG-Matrix
 * Design: Stylized "TG" with matrix grid background
 */
function generateSvgIcon(size = 512) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    
    <!-- Cyan glow gradient -->
    <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22d3ee;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
    
    <!-- Blue accent gradient -->
    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    
    <!-- Glow filter -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="url(#bgGradient)" stroke="url(#cyanGradient)" stroke-width="4"/>
  
  <!-- Matrix grid pattern (background) -->
  <g opacity="0.15" stroke="#22d3ee" stroke-width="1">
    ${generateGridLines(size, 12)}
  </g>
  
  <!-- TG Letters -->
  <g filter="url(#glow)">
    <!-- T letter -->
    <path d="M ${size*0.18} ${size*0.28} 
             L ${size*0.48} ${size*0.28} 
             L ${size*0.48} ${size*0.35}
             L ${size*0.36} ${size*0.35}
             L ${size*0.36} ${size*0.72}
             L ${size*0.30} ${size*0.72}
             L ${size*0.30} ${size*0.35}
             L ${size*0.18} ${size*0.35}
             Z" 
          fill="url(#cyanGradient)"/>
    
    <!-- G letter (stylized) -->
    <path d="M ${size*0.68} ${size*0.28}
             C ${size*0.82} ${size*0.28} ${size*0.82} ${size*0.50} ${size*0.82} ${size*0.50}
             C ${size*0.82} ${size*0.68} ${size*0.68} ${size*0.72} ${size*0.58} ${size*0.72}
             C ${size*0.48} ${size*0.72} ${size*0.45} ${size*0.58} ${size*0.45} ${size*0.50}
             C ${size*0.45} ${size*0.42} ${size*0.50} ${size*0.35} ${size*0.58} ${size*0.35}
             L ${size*0.68} ${size*0.35}
             L ${size*0.68} ${size*0.28}
             Z
             M ${size*0.52} ${size*0.50}
             C ${size*0.52} ${size*0.62} ${size*0.54} ${size*0.65} ${size*0.60} ${size*0.65}
             C ${size*0.70} ${size*0.65} ${size*0.75} ${size*0.60} ${size*0.75} ${size*0.50}
             L ${size*0.65} ${size*0.50}
             L ${size*0.65} ${size*0.55}
             L ${size*0.75} ${size*0.55}
             C ${size*0.75} ${size*0.45} ${size*0.70} ${size*0.42} ${size*0.60} ${size*0.42}
             C ${size*0.54} ${size*0.42} ${size*0.52} ${size*0.45} ${size*0.52} ${size*0.50}
             Z"
          fill="url(#blueGradient)"/>
  </g>
  
  <!-- Data stream dots -->
  <g fill="#22d3ee" opacity="0.6">
    <circle cx="${size*0.15}" cy="${size*0.5}" r="4"/>
    <circle cx="${size*0.85}" cy="${size*0.5}" r="4"/>
    <circle cx="${size*0.5}" cy="${size*0.15}" r="4"/>
    <circle cx="${size*0.5}" cy="${size*0.85}" r="4"/>
  </g>
  
  <!-- Corner accents -->
  <g stroke="url(#cyanGradient)" stroke-width="3" fill="none" opacity="0.8">
    <path d="M ${size*0.08} ${size*0.20} L ${size*0.08} ${size*0.08} L ${size*0.20} ${size*0.08}"/>
    <path d="M ${size*0.80} ${size*0.08} L ${size*0.92} ${size*0.08} L ${size*0.92} ${size*0.20}"/>
    <path d="M ${size*0.92} ${size*0.80} L ${size*0.92} ${size*0.92} L ${size*0.80} ${size*0.92}"/>
    <path d="M ${size*0.20} ${size*0.92} L ${size*0.08} ${size*0.92} L ${size*0.08} ${size*0.80}"/>
  </g>
</svg>`;

  return svg;
}

/**
 * Generate grid lines for matrix effect
 */
function generateGridLines(size, count) {
  let lines = '';
  const step = size / count;
  
  for (let i = 1; i < count; i++) {
    const pos = step * i;
    // Horizontal lines
    lines += `<line x1="50" y1="${pos}" x2="${size-50}" y2="${pos}"/>`;
    // Vertical lines
    lines += `<line x1="${pos}" y1="50" x2="${pos}" y2="${size-50}"/>`;
  }
  
  return lines;
}

/**
 * Create a simpler, cleaner icon design
 */
function generateSimpleIcon(size = 512) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9"/>
      <stop offset="100%" style="stop-color:#0284c7"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Rounded square background -->
  <rect x="20" y="20" width="${size-40}" height="${size-40}" rx="80" fill="url(#bg)" filter="url(#shadow)"/>
  
  <!-- TG text -->
  <text x="${size/2}" y="${size*0.62}" 
        font-family="Arial, sans-serif" 
        font-size="${size*0.38}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">TG</text>
  
  <!-- Matrix subtitle -->
  <text x="${size/2}" y="${size*0.78}" 
        font-family="Arial, sans-serif" 
        font-size="${size*0.10}" 
        fill="rgba(255,255,255,0.8)" 
        text-anchor="middle">MATRIX</text>
  
  <!-- Grid accent lines -->
  <g stroke="rgba(255,255,255,0.2)" stroke-width="2">
    <line x1="80" y1="${size*0.25}" x2="${size-80}" y2="${size*0.25}"/>
    <line x1="80" y1="${size*0.85}" x2="${size-80}" y2="${size*0.85}"/>
  </g>
</svg>`;

  return svg;
}

// Generate and save SVG icons
function main() {
  console.log('🎨 TG-Matrix Icon Generator');
  console.log('================================');
  
  // Generate detailed SVG
  const detailedSvg = generateSvgIcon(512);
  const detailedPath = path.join(BUILD_RESOURCES, 'icon.svg');
  fs.writeFileSync(detailedPath, detailedSvg);
  console.log(`✅ Created: ${detailedPath}`);
  
  // Generate simple SVG
  const simpleSvg = generateSimpleIcon(512);
  const simplePath = path.join(BUILD_RESOURCES, 'icon-simple.svg');
  fs.writeFileSync(simplePath, simpleSvg);
  console.log(`✅ Created: ${simplePath}`);
  
  // Generate different sizes for Linux
  const sizes = [16, 32, 48, 64, 128, 256, 512];
  sizes.forEach(size => {
    const svg = generateSimpleIcon(size);
    const sizePath = path.join(ICONS_DIR, `${size}x${size}.svg`);
    fs.writeFileSync(sizePath, svg);
  });
  console.log(`✅ Created: ${ICONS_DIR}/*.svg (multiple sizes)`);
  
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Open icon.svg or icon-simple.svg in a browser');
  console.log('   2. Use an online converter (e.g., cloudconvert.com) to create:');
  console.log('      - icon.ico (256x256 for Windows)');
  console.log('      - icon.icns (for macOS)');
  console.log('   3. Place the converted files in build-resources/');
  console.log('');
  console.log('   Or use these commands if you have ImageMagick installed:');
  console.log('   convert icon.svg -resize 256x256 icon.ico');
  console.log('');
}

main();
