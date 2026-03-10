# 测试指南 - 重复图片问题修复

## 问题描述（已修复）

**修复前**：
- 拖拽图片：出现两张图片（一张本地路径 + 一张 OSS 链接）
- 粘贴图片：出现两张图片（一张剪切板数据 + 一张 OSS 链接）

**修复后**：
- 拖拽图片：仅显示 OSS 链接 ✅
- 粘贴图片：仅显示 OSS 链接 ✅

## 修复内容

### 1. 事件拦截时机
```typescript
// ❌ 修复前：可能不够及时
this.registerDomEvent(document, "drop", handler);

// ✅ 修复后：使用捕获阶段，优先拦截
this.registerDomEvent(window, "drop", handler, true);
```

### 2. 阻止默认行为
```typescript
private async handleDrop(event: DragEvent): Promise<void> {
  // ✅ 立即阻止，放在函数最开始
  event.preventDefault();
  event.stopPropagation();
  
  // ... 后续处理
}
```

## 测试步骤

### 测试 1: 拖拽上传

1. 打开 Obsidian 和任意 Markdown 文档
2. 准备一张本地图片（PNG/JPG 等）
3. 拖拽图片到文档中
4. **预期结果**：
   - ✅ 只显示 OSS 链接：`![image.png](https://bucket.oss-region.aliyuncs.com/...)`
   - ✅ 不显示本地路径：`![image.png](attachment:image.png)`
   - ✅ 不生成 `.obsidian/attachments/` 文件

### 测试 2: 粘贴上传

1. 复制一张图片到剪贴板
   - 方法 1：截图（Cmd+Ctrl+Shift+4）
   - 方法 2：右键复制网页图片
2. 在文档中按 Cmd+V / Ctrl+V
3. **预期结果**：
   - ✅ 只显示 OSS 链接
   - ✅ 不显示本地路径
   - ✅ 不生成 `.obsidian/attachments/` 文件

### 测试 3: 检查附件目录

1. 打开 Finder/资源管理器
2. 导航到笔记所在目录
3. 检查是否有 `.obsidian/attachments/` 文件夹
4. **预期结果**：
   - ✅ 没有新生成的图片文件
   - ✅ 或者文件夹保持原样（无新增）

### 测试 4: 查看控制台日志

1. 按 `Cmd+Option+I` / `Ctrl+Shift+I` 打开开发者工具
2. 切换到 **Console** 标签
3. 拖拽或粘贴图片
4. **预期日志**：
```
[插件] 拦截拖拽事件：1 个图片文件
[插件] 开始上传：image.png { size: 102400, type: 'image/png' }
[OSS] 开始上传：image.png (102400 bytes) -> obsidian-images/xxx.png
[OSS] 上传成功：https://...
[插件] 上传成功：https://...
```

## 常见问题排查

### 问题 1: 仍然出现两张图片

**可能原因**：
- 插件未正确加载
- 缓存未清除

**解决方法**：
1. 完全重启 Obsidian（不是重新加载）
2. 禁用插件后重新启用
3. 检查控制台是否有错误

### 问题 2: 图片无法上传

**可能原因**：
- OSS 配置不正确
- 网络连接问题

**解决方法**：
1. 检查插件设置中的 OSS 配置
2. 点击"测试连接"按钮
3. 查看控制台错误信息

### 问题 3: 控制台报错

**常见错误**：
```
TypeError: Cannot read property 'preventDefault' of undefined
```

**解决方法**：
- 确保在 Markdown 编辑器中操作
- 检查插件是否最新版本

## 测试检查清单

- [ ] 拖拽 PNG 图片 → 仅显示 OSS 链接
- [ ] 拖拽 JPG 图片 → 仅显示 OSS 链接
- [ ] 粘贴截图 → 仅显示 OSS 链接
- [ ] 粘贴网页图片 → 仅显示 OSS 链接
- [ ] 检查附件目录 → 无新增文件
- [ ] 查看控制台日志 → 显示"拦截"信息
- [ ] 多张图片同时拖拽 → 全部仅显示 OSS 链接
- [ ] 快速连续粘贴 → 全部仅显示 OSS 链接

## 版本信息

- **修复版本**：v1.2.1
- **修复日期**：2026-03-10
- **问题类型**：紧急 Bug 修复
- **影响范围**：所有拖拽和粘贴上传功能

## 回滚方案

如果修复后出现问题，可以：

1. 禁用当前插件
2. 从 Git 历史恢复上一版本：
   ```bash
   git checkout v1.2.0 -- src/main.ts
   npm run build
   ./deploy.sh --force
   ```
3. 重启 Obsidian

## 反馈渠道

如果测试中发现问题，请提供：

1. Obsidian 版本号
2. 操作系统版本
3. 控制台完整错误日志
4. 复现步骤

---

**测试完成后，请删除此文件**
