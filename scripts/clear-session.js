/**
 * Clear session file for a specific account
 * Usage: node scripts/clear-session.js <phone>
 * Example: node scripts/clear-session.js +639952947692
 */
const fs = require('fs');
const path = require('path');

const phone = process.argv[2];

if (!phone) {
    console.error('❌ 错误: 请提供电话号码');
    console.error('   用法: node scripts/clear-session.js <phone>');
    console.error('   示例: node scripts/clear-session.js +639952947692');
    process.exit(1);
}

// Sanitize phone number for filename
const safePhone = phone.replace(/\+/g, '').replace(/-/g, '').replace(/\s/g, '');
const sessionPath = path.join(__dirname, '..', 'backend', 'sessions', `${safePhone}.session`);

console.log(`🔍 查找 session 文件: ${sessionPath}`);

if (!fs.existsSync(sessionPath)) {
    console.log(`ℹ️  Session 文件不存在: ${sessionPath}`);
    process.exit(0);
}

try {
    fs.unlinkSync(sessionPath);
    console.log(`✅ Session 文件已删除: ${sessionPath}`);
    console.log(`\n📝 下一步:`);
    console.log(`   1. 重新启动应用: npm start`);
    console.log(`   2. 点击"登录"按钮`);
    console.log(`   3. 应该会显示验证码输入框`);
} catch (error) {
    console.error(`❌ 删除 session 文件失败: ${error.message}`);
    process.exit(1);
}

