# Image Upload Aliyun OSS - Obsidian 插件

自动将拖拽的图片上传到阿里云 OSS，并在文档中插入图床链接。

## 功能特性

- ✅ 拖拽图片自动上传到阿里云 OSS
- ✅ 支持从系统环境变量读取配置
- ✅ 支持手动配置 OSS 参数
- ✅ 自定义上传路径前缀
- ✅ 测试连接功能
- ✅ 上传成功通知

## 安装方法

### 方法 1：手动安装（推荐）

1. 克隆或下载此仓库
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建插件
4. 将以下文件复制到 Obsidian 插件目录：
   - `manifest.json`
   - `main.js`
   - `styles.css`（如果有）

Obsidian 插件目录位置：
- macOS: `~/Library/Application Support/obsidian/.obsidian/plugins/`
- Windows: `%APPDATA%\Obsidian\obsidian\plugins\`
- Linux: `~/.config/obsidian/.obsidian/plugins/`

5. 在 Obsidian 中启用插件

### 方法 2：BRAT 插件（待发布）

插件发布到社区后，可通过 BRAT 插件安装。

## 配置说明

### 方式 1：手动配置

在插件设置中填写：
- **Endpoint**: OSS 访问端点，如 `oss-cn-beijing.aliyuncs.com`
- **Bucket 名称**: 你的 OSS 存储桶名称
- **AccessKey ID**: 阿里云 AccessKey ID
- **AccessKey Secret**: 阿里云 AccessKey Secret
- **上传路径**: 图片在 OSS 中的存储路径前缀，默认 `obsidian-images`

### 方式 2：环境变量

启用"使用系统环境变量"选项后，将从以下环境变量读取配置：

```bash
export ALIYUN_OSS_ENDPOINT="oss-cn-beijing.aliyuncs.com"
export ALIYUN_OSS_BUCKET="your-bucket-name"
export ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"
```

然后在 Obsidian 启动前设置这些环境变量。

## 使用方法

1. 配置好 OSS 连接信息
2. 点击"测试连接"验证配置
3. 直接将图片拖拽到 Obsidian 文档中
4. 插件会自动上传图片并插入 Markdown 图片链接

### 示例输出

拖拽图片后，会在文档中插入：

```markdown
![image.png](https://your-bucket.oss-cn-beijing.aliyuncs.com/obsidian-images/1709985600000_abc123.png)
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

## 注意事项

1. **OSS Bucket 需要配置公网访问权限**
   - 在 OSS 控制台设置 Bucket 为公共读
   - 或配置 CORS 规则允许跨域访问

2. **敏感信息安全**
   - AccessKey Secret 请妥善保管
   - 建议使用 RAM 子账号的 AccessKey
   - 不要将配置文件提交到版本控制

3. **文件名去重**
   - 使用时间戳 + 随机字符串确保文件名唯一

## 许可证

MIT License

## 🚀 一键部署

### 使用部署脚本（推荐）

```bash
# 标准部署（会询问确认）
./deploy.sh

# 强制更新（不询问）
./deploy.sh --force

# 查看帮助
./deploy.sh --help
```

### 手动部署

1. 构建项目：
   ```bash
   npm run build
   ```

2. 复制文件到 Obsidian 插件目录：

   **macOS:**
   ```bash
   cp main.js manifest.json ~/Library/Application\ Support/obsidian/.obsidian/plugins/image-upload-aliyun-oss/
   ```

   **Windows:**
   ```powershell
   cp main.js manifest.json $env:APPDATA\obsidian\.obsidian\plugins\image-upload-aliyun-oss\
   ```

   **Linux:**
   ```bash
   cp main.js manifest.json ~/.config/obsidian/.obsidian/plugins/image-upload-aliyun-oss/
   ```

3. 在 Obsidian 中启用插件

## 📁 项目结构

```
image-upload-aliyun-oss/
├── src/
│   ├── main.ts              # 主插件入口
│   ├── settings.ts          # 设置界面
│   └── ossService.ts        # OSS 上传服务
├── deploy.sh                # 一键部署脚本
├── main.js                  # 构建输出
├── manifest.json            # 插件清单
├── package.json             # npm 配置
├── tsconfig.json            # TypeScript 配置
└── esbuild.config.mjs       # 打包配置
```

## ⚙️ 配置说明

### 手动配置

在 Obsidian 设置中填写：
- **Endpoint**: `oss-cn-hangzhou.aliyuncs.com`（根据你的区域修改）
- **Bucket**: 你的 OSS Bucket 名称
- **AccessKey ID**: 阿里云 AccessKey ID
- **AccessKey Secret**: 阿里云 AccessKey Secret
- **上传路径前缀**: `obsidian-images/`（可选）

### 环境变量配置

启动 Obsidian 前设置环境变量：

```bash
export ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
export ALIYUN_OSS_BUCKET=your-bucket-name
export ALIYUN_OSS_ACCESS_KEY_ID=LTAI5t...
export ALIYUN_OSS_ACCESS_KEY_SECRET=your-secret
obsidian
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（监听）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run typecheck
```

## 📝 使用说明

1. 启用插件后，配置阿里云 OSS 信息
2. 拖拽图片到 Obsidian 文档
3. 图片自动上传到 OSS
4. 文档中插入 Markdown 图片语法：`![图片名](https://...)`

## ⚠️ 注意事项

- 首次使用需要配置阿里云 OSS 信息
- 确保 AccessKey 有 OSS 上传权限
- 图片上传需要网络连接
- 建议在测试环境先验证配置
