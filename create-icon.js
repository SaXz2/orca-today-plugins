// 简单的图标创建脚本
const fs = require('fs');
const { createCanvas } = require('canvas');

// 如果没有 canvas 包，创建一个简单的 SVG 图标
const svgIcon = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="8" fill="#4A90E2"/>
  <text x="32" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white">T</text>
</svg>`;

// 将 SVG 保存为文件
fs.writeFileSync('icon.svg', svgIcon);
console.log('Created icon.svg - please convert to PNG format for the plugin');
