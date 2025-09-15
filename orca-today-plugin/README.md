# Orca Today Plugin

一个为 Orca Note 设计的智能 Today 标签管理插件，自动为带有 `#Today` 标签的块添加和更新日期属性。

## ✨ 功能特性

- 🏷️ **自动标签管理**：自动检测和管理带有 `#Today` 标签的块
- 📅 **智能日期更新**：自动为 Today 标签添加 `date` 属性并保持为当前日期

## 使用

在右侧 Releases 选择最新版本下载，插件放置到对应位置以后需要重启 Orca Note

### 插件结构目录
```
orca-today-plugin/
├── dist/                     # 编译后的代码
│   └── index.js              # 插件主文件
├── src/
│   ├── main.ts               # 插件入口文件
│   ├── orca.d.ts             # Orca API 类型定义
│   ├── libs/
│   │   └── l10n.ts           # 国际化支持
│   └── translations/
│       └── zhCN.ts           # 中文翻译
├── plugin-docs/              # 插件文档
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 构建配置
└── README.md                 # 项目说明
```

## 使用方法

1. **添加 Today 标签**：在任意块中添加 `#Today` 标签
   ```
   - [ ] 完成项目报告 #Today
   - [ ] 准备会议材料 #Today
   - [ ] 回复客户邮件 #Today
   ```

2. **自动处理**：插件会自动：
   - 检测到带有 `#Today` 标签的块
   - 为这些块创建 Today 属性引用
   - 添加 `date` 属性（值为当前日期）
   - 持续监控和更新

3. **手动更新**：如需立即更新，可通过命令面板执行：
   - 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
   - 搜索 "更新Today标签的日期属性"
   - 执行命令


### 项目结构



## 🔧 配置选项

插件目前使用默认配置，未来版本将支持以下配置选项：

- 更新间隔设置
- 实时监控开关
- 日志级别控制
- 自定义日期格式

## 📊 工作原理

### 初始化流程

1. **插件加载**：检查 Today 标签是否存在，如不存在则创建
2. **属性设置**：为 Today 标签添加 `date` 属性（DateTime 类型）
3. **批量处理**：更新所有带 Today 标签的块的 date 属性为今日日期
4. **监控启动**：启动定时监控和更新机制

### 监控机制

- **实时监控**：每30秒检查新添加的 Today 标签
- **定时更新**：每1小时更新所有 Today 标签的日期属性
- **即时处理**：检测到新的 Today 标签时立即创建 date 属性

### 数据结构

插件操作的数据结构：

```typescript
// Today 标签引用
{
  type: RefType.Property,
  alias: "Today",
  data: [
    {
      name: "date",
      type: PropType.DateTime,
      value: Date
    }
  ]
}
```

## 🐛 故障排除

### 常见问题

**Q: 插件没有自动运行**
- 检查插件是否已启用
- 查看控制台是否有错误信息
- 尝试手动触发更新命令

**Q: Today 标签没有创建 date 属性**
- 检查 API 权限
- 查看控制台错误信息
- 尝试重新启动 Orca Note

**Q: 日期属性没有更新**
- 检查 Today 属性引用是否正确创建
- 查看 setRefData 调用是否成功
- 检查日期值是否正确

### 调试信息

打开开发者工具（F12）查看控制台输出：

```javascript
// 正常日志
找到 X 个带有Today标签的块
处理块 xxx: {块数据}
成功为块 xxx 创建Today标签和date属性
Today标签日期更新完成，更新了 X 个标签

// 错误日志
为块 xxx 创建Today标签失败: [错误信息]
为块 xxx 强制创建date属性失败: [错误信息]
```

## 📝 更新日志

### v0.0.0
- 初始版本发布
- 支持 Today 标签自动管理
- 实现实时监控和定时更新
- 添加多语言支持

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Orca Note](https://github.com/sethyuan/orca) - 优秀的笔记应用
- [Orca Plugin Template](https://github.com/sethyuan/orca-plugin-template) - 插件开发模板

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [故障排除](#故障排除) 部分
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 Issue 并提供详细信息

---

**注意**：本插件需要 Orca Note 的最新版本才能正常工作。