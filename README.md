# Aliyun OSS Image Upload - Obsidian 插件

> 🚀 解决 Obsidian 图片同步难题，让笔记随时随地完美展示

**最新版本**：v1.2.2 | **更新时间**：2026-03-10

---

## 💔 你可能遇到过这些问题

### ❌ Obsidian 默认图片存储的痛点

1. **多设备同步困难**
   - 图片保存在本地 `.obsidian` 目录
   - 使用 iCloud/坚果云同步时，图片经常丢失
   - 手机/平板查看笔记时，图片无法显示

2. **Git 仓库体积膨胀**
   - 图片文件占用大量空间
   - Git 提交历史快速增长
   - 克隆/拉取消耗大量时间

3. **分享笔记时图片失效**
   - 发布到博客/网站时图片链接断裂
   - 分享给他人时无法查看图片
   - 公开笔记需要手动上传图片

### ✅ 本插件的解决方案

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  拖拽/粘贴图片   │ ──→  │  阿里云 OSS   │ ──→  │  CDN 全球加速    │
│  到 Obsidian    │      │  自动上传     │      │  链接永久有效    │
└─────────────────┘      └──────────────┘      └─────────────────┘
```

- 🖼️ **自动上传** - 拖拽或粘贴图片自动上传到 OSS
- 🔗 **CDN 链接** - 使用阿里云 CDN，全球快速访问
- 📱 **多设备同步** - 所有设备访问同一图片链接
- 📦 **仓库精简** - 图片不占用 Git 仓库空间
- 🌐 **分享无忧** - 公开笔记图片永久有效

---

## ✨ 功能特性

### 核心功能

- ✅ **拖拽上传** - 拖拽图片到文档自动上传到 OSS
- ✅ **粘贴上传** - Ctrl+V / Cmd+V 粘贴图片自动上传
- ✅ **阻止重复** - 智能拦截，不生成多余本地文件
- ✅ **自动重试** - 网络错误自动重试（最多 3 次）
- ✅ **文件验证** - 大小限制（10MB）+ 类型白名单
- ✅ **并发控制** - 最多同时上传 3 个文件
- ✅ **详细日志** - 完整的上传过程记录
- ✅ **友好提示** - 上传进度 + 成功/失败通知

### 支持的图片格式

PNG, JPEG/JPG, GIF, WebP, SVG, BMP, HEIC, HEIF

---

## 🏗️ 阿里云 OSS 配置指南

### 步骤 1: 创建 OSS Bucket

1. 登录 [阿里云控制台](https://homenew.console.aliyun.com/)
2. 进入 **产品与服务** → **对象存储 OSS**
3. 点击 **创建 Bucket**

#### 推荐配置

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **Bucket 名称** | `yourname-obsidian` | 全局唯一，小写字母 + 数字 |
| **地域** | 离你最近的区域 | 如：华东 1(杭州)、华北 2(北京) |
| **存储类型** | 标准存储 | 适合频繁访问的图片 |
| **读写权限** | 私有（推荐） | 通过签名 URL 访问更安全 |

### 步骤 2: 获取 AccessKey（推荐 RAM 子账号）

**安全建议**：不要使用主账号 AccessKey，创建专用子账号！

1. 访问 [RAM 访问控制](https://ram.console.aliyun.com/)
2. 点击 **用户** → **创建用户**
3. 填写信息：
   - 登录名称：`obsidian-uploader`
   - 访问方式：勾选 **OpenAPI 调用访问**
4. 保存 AccessKey ID 和 Secret（只显示一次！）
5. 为用户授权 `AliyunOSSFullAccess`

### 步骤 3: 配置 CORS（如遇到跨域错误）

1. 进入 Bucket → **数据安全** → **跨域设置**
2. 创建规则：
   - 来源：`*`
   - 允许的方法：`GET, POST, PUT`
   - 允许 Header：`*`

---

## 📦 安装

### 方式 1: 使用部署脚本（推荐）

```bash
cd /path/to/image-upload-aliyun-oss
./deploy.sh --force
```

### 方式 2: 手动安装

```bash
# 1. 克隆仓库
git clone https://github.com/yswwpp/image-upload-aliyun-oss.git
cd image-upload-aliyun-oss

# 2. 安装依赖并构建
npm install
npm run build

# 3. 复制到 Obsidian 插件目录
# macOS
cp main.js manifest.json ~/Library/Application\ Support/obsidian/.obsidian/plugins/image-upload-aliyun-oss/
```

---

## ⚙️ 插件配置

### 基本配置

1. 打开 Obsidian **设置**
2. 进入 **第三方插件** → **Aliyun OSS Image Upload**
3. 填写配置：

| 配置项 | 示例值 | 说明 |
|--------|--------|------|
| **Endpoint** | `oss-cn-hangzhou.aliyuncs.com` | 根据 Bucket 地域选择 |
| **Bucket** | `yourname-obsidian` | 你的 Bucket 名称 |
| **AccessKey ID** | `LTAI5t...` | RAM 用户 AccessKey ID |
| **AccessKey Secret** | `xxxxx` | RAM 用户 AccessKey Secret |
| **上传路径前缀** | `obsidian-images/` | OSS 中存储的目录 |

### Endpoint 选择指南

| 地域 | Endpoint | 适用地区 |
|------|----------|----------|
| 华东 1(杭州) | `oss-cn-hangzhou.aliyuncs.com` | 上海、浙江、江苏 |
| 华东 2(上海) | `oss-cn-shanghai.aliyuncs.com` | 上海、安徽 |
| 华北 2(北京) | `oss-cn-beijing.aliyuncs.com` | 北京、天津、河北 |
| 华南 1(深圳) | `oss-cn-shenzhen.aliyuncs.com` | 广东、广西 |

---

## 🎨 使用指南

### 功能 1: 拖拽上传

1. 打开任意 Markdown 文档
2. 从 Finder/资源管理器拖拽图片到文档
3. 图片自动上传到 OSS
4. 插入 Markdown 语法：`![image.png](https://...)`

**支持来源**：
- 📁 本地图片文件
- 🌐 网页上的图片
- 📸 截图工具保存的文件

### 功能 2: 剪切板粘贴上传

1. 复制图片到剪切板：
   - 截图：`Cmd+Ctrl+Shift+4` (macOS) / `Win+Shift+S` (Windows)
   - 右键复制网页图片
   - 复制图片文件
2. 在 Obsidian 文档中按 `Cmd+V` / `Ctrl+V`
3. 图片自动上传到 OSS
4. 在光标位置插入 Markdown 语法

**支持来源**：
- 📸 系统截图（PNG 格式）
- 🌐 网页复制的图片
- 📋 其他应用复制的图片

---

## 📖 使用场景示例

### 场景 1: 写技术博客

```markdown
# 我的技术笔记

## 项目架构图

![架构图](https://your-bucket.oss-cn-hangzhou.aliyuncs.com/obsidian-images/architecture.png)

## 流程图

![流程图](https://your-bucket.oss-cn-hangzhou.aliyuncs.com/obsidian-images/flow-chart.png)
```

**优势**：
- 发布到博客时图片自动显示
- 无需手动上传图片到博客平台
- 图片加载速度快（CDN 加速）

### 场景 2: 多设备同步笔记

```
MacBook (编辑) ──┐
                 ├──→ 阿里云 OSS + CDN ──→ 所有设备图片秒开
iPad (查看)   ──┘
iPhone (查看) ──┘
```

**优势**：
- 所有设备访问同一图片链接
- 无需同步图片文件
- 节省 iCloud/网盘空间

### 场景 3: Git 版本控制

```bash
# 使用插件前
$ git clone your-repo
Receiving objects: 500.00 MiB

# 使用插件后
$ git clone your-repo
Receiving objects: 5.00 MiB  # 减少 99%
```

**优势**：
- Git 仓库体积减少 95%+
- 克隆/拉取速度提升 100 倍

---

## 💰 费用说明

### 按量付费（个人用户）

| 资源 | 单价 | 月用量估算 | 月费用 |
|------|------|-----------|--------|
| 存储费 | 0.12 元/GB/月 | 10GB | 1.2 元 |
| 流量费 | 0.50 元/GB | 5GB | 2.5 元 |
| 请求费 | 0.01 元/万次 | 10 万次 | 0.1 元 |
| **合计** | - | - | **约 3.8 元/月** |

### 免费额度（新用户）

- 新用户注册赠送 **40GB 存储包**（1 年）
- 每月 **5GB 免费流量**

---

## 🔧 开发

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/yswwpp/image-upload-aliyun-oss.git
cd image-upload-aliyun-oss

# 2. 安装依赖
npm install

# 3. 开发模式（监听）
npm run dev

# 4. 生产构建
npm run build

# 5. 部署到 Obsidian
./deploy.sh
```

### 项目结构

```
image-upload-aliyun-oss/
├── src/
│   ├── main.ts              # 主插件入口
│   ├── settings.ts          # 设置界面
│   ├── ossService.ts        # OSS 上传服务
│   └── ali-oss.d.ts         # 类型声明
├── deploy.sh                # 一键部署脚本
├── main.js                  # 构建输出
├── manifest.json            # 插件清单
├── package.json             # npm 配置
├── tsconfig.json            # TypeScript 配置
└── esbuild.config.mjs       # 打包配置
```

---

## 🐛 故障排查

### 插件无法加载

1. 检查 Obsidian 控制台（`Cmd+Option+I`）
2. 确认 `main.js` 和 `manifest.json` 在正确目录
3. 重启 Obsidian

### 上传失败

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| OSS 配置不完整 | 配置未保存 | 重新填写并保存 |
| 网络错误 | 网络不通 | 检查网络连接 |
| 403 Forbidden | AccessKey 错误 | 检查 AccessKey |
| 404 Not Found | Bucket 不存在 | 检查 Bucket 名称 |

### 出现重复图片

1. 重启 Obsidian
2. 禁用插件后重新启用
3. 检查控制台是否有错误

---

## 📝 更新日志

### v1.2.2 (2026-03-10)
- 🐛 **修复** URL 编码问题（移除 %2F）
- ✅ URL 更清晰、更标准

### v1.2.1 (2026-03-10)
- 🚨 **紧急修复** 重复图片问题
- ✅ 使用捕获阶段拦截事件
- ✅ 阻止 Obsidian 默认保存行为

### v1.2.0 (2026-03-10)
- ✨ **代码健壮性增强**
- 🔄 自动重试（最多 3 次）
- ✅ 文件验证（大小 + 类型）
- 📊 并发控制（最多 3 个）
- 📝 详细日志和错误提示

### v1.1.1 (2026-03-10)
- 🐛 **修复** CORS 错误
- 🔧 改用 Node.js https 模块

### v1.1.0 (2026-03-10)
- ✨ **新增** 剪切板粘贴上传
- 📋 支持截图、复制图片粘贴

### v1.0.0 (2026-03-09)
- 🎉 初始版本发布
- 🖼️ 支持拖拽图片上传

---

## 📄 许可证

MIT License

---

## 🔗 相关链接

- [GitHub 仓库](https://github.com/yswwpp/image-upload-aliyun-oss)
- [阿里云 OSS 文档](https://help.aliyun.com/product/31815.html)
- [Obsidian 插件开发](https://docs.obsidian.md/Plugins/Getting+started+with+plugins)

---

<div align="center">

**如果这个插件对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by yswwpp

</div>
