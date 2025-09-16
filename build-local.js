import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 开始构建 Orca Today Plugin...');

try {
  // 1. 安装依赖
  console.log('📦 安装依赖...');
  execSync('npm ci', { stdio: 'inherit' });
  
  // 2. 构建插件
  console.log('🔨 构建插件...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 3. 创建插件发布目录
  console.log('📁 创建插件发布目录...');
  const pluginDir = 'orca-today-plugin';
  if (fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true });
  }
  fs.mkdirSync(pluginDir);
  
  // 4. 复制必要文件
  console.log('📋 复制文件...');
  
  // 创建dist目录
  const distDir = path.join(pluginDir, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }
  
  const filesToCopy = [
    { src: 'dist/index.js', dest: 'dist/index.js' },
    { src: 'package.json', dest: 'package.json' },
    { src: 'README.md', dest: 'README.md' },
    { src: 'LICENSE', dest: 'LICENSE' },
    { src: 'RELEASES.md', dest: 'RELEASES.md' }
  ];
  
  filesToCopy.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(pluginDir, dest));
      console.log(`  ✅ 复制 ${src} -> ${dest}`);
    } else {
      console.log(`  ⚠️  文件不存在: ${src}`);
    }
  });
  
  // 5. 复制图标
  if (fs.existsSync('icon.svg')) {
    fs.copyFileSync('icon.svg', path.join(pluginDir, 'icon.svg'));
    console.log('  ✅ 复制 icon.svg');
  }
  
  // 6. 创建压缩包
  console.log('📦 创建压缩包...');
  try {
    // 尝试使用 PowerShell 压缩
    execSync(`powershell Compress-Archive -Path "${pluginDir}\\*" -DestinationPath "orca-today-plugin.zip" -Force`, { stdio: 'inherit' });
  } catch (error) {
    console.log('  ⚠️  PowerShell 压缩失败，跳过压缩包创建');
    console.log('  📁 插件文件已准备好，位于:', pluginDir);
  }
  
  console.log('🎉 构建完成！');
  console.log('📁 插件目录:', pluginDir);
  console.log('📦 压缩包:', 'orca-today-plugin.zip');
  
} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}
