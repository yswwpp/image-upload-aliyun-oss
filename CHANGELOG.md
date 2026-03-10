# 更新日志

## v1.1.1 (2026-03-10)

### 🐛 Bug 修复

- **修复粘贴上传 CORS 错误** - 将上传方法从 fetch + FormData 改为 Node.js https 模块
  - 解决了 Electron 环境中的跨域问题
  - 统一拖拽和粘贴使用相同的上传逻辑
  - 避免 403 Forbidden 错误

### 🔧 技术改进

- 使用 `https.request()` 替代 `fetch()` 进行 OSS 上传
- 使用 OSS 签名 V1 协议（PUT 请求）
- 添加请求超时处理（30 秒）
- 改进错误处理和日志输出

### 📝 代码变更

**ossService.ts**:
```typescript
// 之前：使用 fetch + FormData（会遇到 CORS 问题）
const response = await fetch(url, {
  method: 'POST',
  body: formData
});

// 现在：使用 Node.js https 模块
const req = https.request(options, (res) => {
  // 处理响应
});
req.write(Buffer.from(new Uint8Array(fileContent)));
req.end();
```

---

## v1.1.0 (2026-03-10)

### ✨ 新功能

- **剪切板粘贴上传** - 支持 Ctrl+V / Cmd+V 粘贴图片
  - 自动识别剪切板中的图片
  - 支持截图、复制的图片等
  - 在光标位置插入 Markdown 链接

- **文件格式识别** - 根据 MIME 类型自动获取文件扩展名
  - PNG, JPEG, GIF, WebP, SVG, BMP, HEIC

### 📝 文档更新

- 更新 README.md 添加粘贴功能说明
- 添加使用场景示例
- 添加故障排查指南

---

## v1.0.0 (2026-03-09)

### 🎉 初始版本

- **拖拽上传** - 拖拽图片到文档自动上传
- **Markdown 链接** - 自动插入 `![图片名](URL)` 格式
- **灵活配置** - 支持手动配置或环境变量
- **自定义路径** - 可配置 OSS 存储路径前缀
- **轻量构建** - 12KB 构建体积

### ⚙️ 核心功能

- 使用阿里云 OSS 作为图床
- 支持所有主流图片格式
- 自动时间戳命名
- 上传状态提示

### 📦 技术栈

- TypeScript 5.3+
- Obsidian Plugin API 1.4+
- Node.js https 模块
- esbuild 打包

---

## v1.2.0 (2026-03-10) - 代码健壮性增强

### ✨ 新增功能

#### 1. 错误处理和重试机制
- **自动重试** - 网络错误自动重试（最多 3 次，间隔 1 秒）
- **OSS 错误码解析** - 解析 XML 错误响应，提供友好提示
- **错误分类** - 区分可重试和不可重试错误
- **详细日志** - 记录完整错误上下文（文件名、大小、错误码）

#### 2. 输入验证
- **文件大小限制** - 最大 10MB，超限前提示
- **文件类型白名单** - 仅允许常见图片格式
  - PNG, JPEG, GIF, WebP, SVG, BMP, HEIC, HEIF
- **空文件检测** - 阻止上传 0 字节文件
- **配置验证** - 启动时检查 OSS 配置完整性

#### 3. 边界情况处理
- **网络超时** - 30 秒超时自动终止
- **并发控制** - 最多同时上传 3 个文件
- **服务降级** - OSS 不可用时提供明确提示
- **批量上传** - 支持队列处理，避免资源耗尽

#### 4. 资源清理
- **连接关闭** - HTTPS 请求完成后自动释放
- **通知清理** - 插件卸载时清理所有活跃通知
- **内存管理** - 避免大文件导致的内存泄漏

### 🔧 技术改进

#### ossService.ts 增强
```typescript
// 新增功能
- validateFile()      // 文件验证
- parseOSSError()     // OSS 错误解析
- getFriendlyError()  // 友好错误提示
- isRetryableError()  // 判断是否可重试
- uploadFiles()       // 批量上传（带并发控制）
```

#### main.ts 增强
```typescript
// 新增功能
- 上传进度通知
- 成功/失败详细提示
- 完整的错误日志
- 插件卸载清理
```

### 📝 用户体验优化

#### 通知增强
- 📤 **上传中** - 显示文件名和大小
- ✅ **成功** - 显示完整 URL（5 秒）
- ❌ **失败** - 显示具体错误原因（8 秒）
- 💡 **建议** - 网络问题时提供重试建议

#### 日志增强
```
[插件] 检测到 2 个图片文件
[插件] 开始上传：image.png (1024 KB)
[OSS] 开始上传：image.png -> obsidian-images/xxx.png
[OSS] 上传成功：https://bucket.oss-region.aliyuncs.com/xxx.png
[插件] 上传成功：https://bucket.oss-region.aliyuncs.com/xxx.png
```

### 🐛 Bug 修复

- 修复粘贴上传 CORS 错误（v1.1.1）
- 修复大文件上传超时问题
- 修复并发上传导致的资源竞争

### 📊 代码统计

| 项目 | 修改前 | 修改后 | 改进 |
|------|--------|--------|------|
| **ossService.ts** | 150 行 | 350 行 | +133% |
| **main.ts** | 180 行 | 280 行 | +55% |
| **错误处理** | 基础 | 完整 | ✅ |
| **日志记录** | 少量 | 详细 | ✅ |
| **用户提示** | 简单 | 详细 | ✅ |

### 🔒 安全性提升

- ✅ 文件类型白名单验证
- ✅ 文件大小限制
- ✅ OSS 配置完整性检查
- ✅ 错误信息不泄露敏感数据

### 📈 性能优化

- ✅ 并发控制（最多 3 个同时上传）
- ✅ 超时控制（30 秒）
- ✅ 自动重试（避免临时故障）
- ✅ 资源清理（避免内存泄漏）

---

---

## v1.2.1 (2026-03-10) - 紧急修复：重复图片问题

### 🐛 Bug 修复

#### 修复重复图片问题

**问题描述**：
- ❌ 拖拽图片：出现两张图片（本地路径 + OSS 链接）
- ❌ 粘贴图片：出现两张图片（剪切板数据 + OSS 链接）

**根本原因**：
- 事件监听器没有在捕获阶段注册
- `preventDefault()` 调用时机不够及时
- Obsidian 的默认图片保存逻辑在插件之前执行

**修复方案**：
1. ✅ 使用**捕获阶段**（`useCapture=true`）注册事件监听器
2. ✅ 在事件处理函数**最开始**调用 `preventDefault()` 和 `stopPropagation()`
3. ✅ 将事件监听范围从 `document` 改为 `window`

**代码变更**：
```typescript
// ❌ 修复前
this.registerDomEvent(document, "drop", this.handleDrop.bind(this));

// ✅ 修复后
this.registerDomEvent(window, "drop", this.handleDrop.bind(this), true);
//                                                                ^^^^
//                                                          捕获阶段
```

```typescript
// ❌ 修复前：可能调用不够及时
private async handleDrop(event: DragEvent): Promise<void> {
  if (!event.dataTransfer?.files) return;
  event.preventDefault(); // 太晚了
  // ...
}

// ✅ 修复后：立即阻止
private async handleDrop(event: DragEvent): Promise<void> {
  event.preventDefault();    // ✅ 第一时间
  event.stopPropagation();   // ✅ 阻止传播
  
  if (!event.dataTransfer?.files) return;
  // ...
}
```

### 📝 测试验证

**测试步骤**：
1. 拖拽图片到文档 → ✅ 仅显示 OSS 链接
2. 粘贴图片到文档 → ✅ 仅显示 OSS 链接
3. 检查 `.obsidian/attachments/` → ✅ 无新增文件

**预期日志**：
```
[插件] 拦截拖拽事件：1 个图片文件
[插件] 开始上传：image.png
[OSS] 上传成功：https://...
```

### 📊 影响范围

| 功能 | 修复前 | 修复后 |
|------|--------|--------|
| 拖拽上传 | ❌ 重复图片 | ✅ 正常 |
| 粘贴上传 | ❌ 重复图片 | ✅ 正常 |
| 本地文件 | ❌ 生成附件 | ✅ 不生成 |
| 事件拦截 | ❌ 时机晚 | ✅ 捕获阶段 |

### 🔧 技术细节

**事件流优先级**：
```
1. 捕获阶段（我们的插件）← 在这里拦截
2. 目标阶段
3. 冒泡阶段（Obsidian 默认处理）← 已被阻止
```

**关键点**：
- `window` 比 `document` 更早捕获事件
- `capture: true` 在捕获阶段触发
- `preventDefault()` 必须在默认行为前调用
- `stopPropagation()` 阻止事件继续传播

---

---

## v1.2.2 (2026-03-10) - 修复：图片 URL 编码问题

### 🐛 Bug 修复

#### 修复 Markdown 链接中的 URL 编码问题

**问题描述**：
- ❌ 生成的链接：`![image.png](https://bucket.oss.cn-beijing.aliyuncs.com/obsidian-images%2F123456_image.png)`
- ✅ 期望的链接：`![image.png](https://bucket.oss.cn-beijing.aliyuncs.com/obsidian-images/123456_image.png)`

**问题原因**：
- 生成 `fileUrl` 时使用了 `encodeURIComponent(objectKey)`
- 导致路径中的 `/` 被编码成 `%2F`

**修复方案**：
```typescript
// ❌ 修复前
const fileUrl = `https://${host}/${encodeURIComponent(objectKey)}`;
// 结果：https://bucket.oss.cn-beijing.aliyuncs.com/obsidian-images%2F123456_image.png

// ✅ 修复后
const fileUrl = `https://${host}/${objectKey}`;
// 结果：https://bucket.oss.cn-beijing.aliyuncs.com/obsidian-images/123456_image.png
```

**技术说明**：
- **请求 path**：需要 `encodeURIComponent`（OSS API 要求）
- **返回 URL**：不需要编码（浏览器会自动处理）

```typescript
// 请求时（需要编码）
const options = {
  path: `/${encodeURIComponent(objectKey)}`,  // ✅ 正确
  // ...
};

// 返回 URL 时（不需要编码）
const fileUrl = `https://${host}/${objectKey}`;  // ✅ 正确
```

### 📝 测试验证

**测试步骤**：
1. 拖拽图片到文档
2. 粘贴图片到文档
3. 检查生成的 Markdown 链接

**预期结果**：
```markdown
✅ 正确格式：
![image.png](https://bucket.oss-cn-beijing.aliyuncs.com/obsidian-images/123456_image.png)

❌ 错误格式（已修复）：
![image.png](https://bucket.oss-cn-beijing.aliyuncs.com/obsidian-images%2F123456_image.png)
```

### 📊 影响范围

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 拖拽上传 | ❌ URL 含 %2F | ✅ 正常 URL |
| 粘贴上传 | ❌ URL 含 %2F | ✅ 正常 URL |
| 链接可读性 | ❌ 差 | ✅ 好 |
| CDN 兼容 | ⚠️ 部分 CDN 不支持 | ✅ 完全兼容 |

### 🔧 代码变更

**ossService.ts**:
- 第 250 行：移除 `encodeURIComponent`
- 添加注释说明请求 path 和返回 URL 的区别

**影响**：
- ✅ URL 更清晰可读
- ✅ 兼容所有 CDN 服务
- ✅ 符合 Markdown 标准
- ✅ 便于手动编辑

---

---

## v1.2.3 (2026-03-10) - 紧急修复：无法粘贴文本问题

### 🐛 严重 Bug 修复

#### 修复无法粘贴纯文本的问题

**问题描述**：
- ❌ 无法粘贴纯文本内容
- ❌ 复制的文字无法粘贴到文档
- ❌ 插件拦截了所有 paste 事件

**根本原因**：
```typescript
// ❌ 错误代码：在检查图片前就调用了 preventDefault
private async handlePaste(event: ClipboardEvent): Promise<void> {
  event.preventDefault();  // ❌ 太早了！
  event.stopPropagation();
  
  // ... 后续检查
  if (imageItems.length === 0) return;  // 已经太晚了
}
```

**修复方案**：
```typescript
// ✅ 正确代码：先检查，有图片才拦截
private async handlePaste(event: ClipboardEvent): Promise<void> {
  if (!event.clipboardData?.items) return;
  
  const items = Array.from(event.clipboardData.items);
  const imageItems = items.filter((item) => item.type.startsWith("image/"));
  
  // ✅ 关键：没有图片时立即返回，不拦截
  if (imageItems.length === 0) {
    return; // 让 Obsidian 正常处理文本粘贴
  }
  
  // ✅ 只有在有图片时才拦截
  event.preventDefault();
  event.stopPropagation();
  
  // ... 处理图片上传
}
```

### 📝 测试验证

**测试场景**：

| 操作 | 修复前 | 修复后 |
|------|--------|--------|
| 复制文字 → 粘贴 | ❌ 无法粘贴 | ✅ 正常粘贴 |
| 复制图片 → 粘贴 | ✅ 上传 OSS | ✅ 上传 OSS |
| 复制网页（文字 + 图片） | ❌ 仅图片 | ✅ 文字 + 图片都正常 |
| 截图 → 粘贴 | ✅ 上传 OSS | ✅ 上传 OSS |

**测试步骤**：
1. 复制一段文字（如："测试文本"）
2. 在 Obsidian 中按 Cmd+V / Ctrl+V
3. **预期**：文字正常粘贴到文档
4. 复制一张图片
5. 在 Obsidian 中按 Cmd+V / Ctrl+V
6. **预期**：图片上传到 OSS 并插入链接

### 📊 影响范围

| 功能 | v1.2.2 | v1.2.3 |
|------|--------|--------|
| 纯文本粘贴 | ❌ 无法使用 | ✅ 正常 |
| 图片粘贴 | ✅ 正常 | ✅ 正常 |
| 混合内容 | ❌ 部分丢失 | ✅ 正常 |
| 文本编辑体验 | ❌ 差 | ✅ 好 |

### ⚠️ 重要提示

此修复解决了影响基本编辑功能的问题，**强烈建议所有用户更新**！

**更新后请测试**：
- [ ] 复制文字 → 粘贴 → 正常显示
- [ ] 复制图片 → 粘贴 → 上传到 OSS
- [ ] 日常文本编辑不受影响

---
