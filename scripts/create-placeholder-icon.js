/**
 * Create a simple placeholder icon file
 * This is a temporary solution until a proper icon is provided
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');

// Create build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

console.log('📝 创建图标占位符说明文件...\n');

const readmeContent = `# 图标文件说明

## 当前状态

图标文件不存在，应用将使用 Electron 默认图标。

## 如何添加自定义图标

### Windows (.ico)

1. 准备一个 256x256 或更大的 PNG 图片
2. 使用在线工具转换为 .ico 格式：
   - https://convertio.co/png-ico/
   - https://www.icoconverter.com/
3. 将转换后的文件保存为 \`build/icon.ico\`

### macOS (.icns)

1. 准备一个 512x512 或更大的 PNG 图片
2. 使用在线工具转换为 .icns 格式：
   - https://cloudconvert.com/png-to-icns
3. 将转换后的文件保存为 \`build/icon.icns\`

### Linux (.png)

1. 准备一个 512x512 的 PNG 图片
2. 直接保存为 \`build/icon.png\`

## 图标要求

- **尺寸**: 至少 256x256（推荐 512x512 或更大）
- **格式**: PNG（转换前）
- **背景**: 透明或白色
- **内容**: 应用 Logo 或标识

## 注意事项

- 图标文件是可选的
- 如果没有图标，应用会使用 Electron 默认图标
- 添加图标后需要重新打包应用
`;

const readmePath = path.join(buildDir, 'README-图标说明.md');
fs.writeFileSync(readmePath, readmeContent, 'utf8');

console.log('✅ 已创建图标说明文件: build/README-图标说明.md');
console.log('\n💡 提示：');
console.log('   - 图标文件是可选的，应用会使用默认图标');
console.log('   - 如需自定义图标，请按照说明文件添加图标文件');
console.log('   - 添加图标后需要重新打包应用\n');

