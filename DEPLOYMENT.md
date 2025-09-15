# 部署说明

## 🚀 自动部署

项目已配置 GitHub Actions 自动构建和发布。当推送标签时，会自动触发构建流程。

### 创建新版本发布

1. **更新版本号**
   ```bash
   # 更新 package.json 中的版本号
   npm version patch  # 补丁版本 (0.1.0 -> 0.1.1)
   npm version minor  # 次要版本 (0.1.0 -> 0.2.0)
   npm version major  # 主要版本 (0.1.0 -> 1.0.0)
   ```

2. **推送标签**
   ```bash
   git push origin main --tags
   ```

3. **GitHub Actions 会自动**
   - 构建插件
   - 创建发布包
   - 发布到 GitHub Releases

## 🛠️ 手动部署

如果需要手动构建和发布：

### 1. 本地构建

```bash
# 运行构建脚本
node build-local.js
```

这会创建：
- `orca-today-plugin/` 目录（插件文件）
- `orca-today-plugin.zip` 压缩包

### 2. 插件结构

构建后的插件目录结构：
```
orca-today-plugin/
├── index.js              # 编译后的插件主文件
├── package.json          # 插件配置
├── README.md            # 插件说明
├── LICENSE              # MIT 许可证
├── RELEASES.md          # 发布说明
└── icon.svg             # 插件图标
```

### 3. 安装插件

1. 下载 `orca-today-plugin.zip`
2. 解压到 Orca Note 的 `plugins` 目录
3. 重启 Orca Note
4. 在设置中启用插件

## 📋 发布检查清单

- [ ] 更新版本号
- [ ] 更新 CHANGELOG.md
- [ ] 测试插件功能
- [ ] 构建插件包
- [ ] 创建 Git 标签
- [ ] 推送到 GitHub
- [ ] 验证 GitHub Actions 构建
- [ ] 检查 GitHub Releases

## 🔧 故障排除

### GitHub Actions 构建失败

1. 检查 `.github/workflows/build-and-release.yml` 配置
2. 查看 Actions 日志
3. 确保所有依赖正确安装

### 本地构建失败

1. 确保 Node.js 版本正确
2. 删除 `node_modules` 重新安装
3. 检查 TypeScript 编译错误

### 插件无法加载

1. 检查 `dist/index.js` 是否正确生成
2. 验证 Orca Note 版本兼容性
3. 查看浏览器控制台错误

## 📞 支持

如果遇到部署问题，请：
1. 查看 [故障排除](#故障排除) 部分
2. 搜索现有的 [Issues](https://github.com/SaXz2/orca-today-plugins/issues)
3. 创建新的 Issue 并提供详细信息
