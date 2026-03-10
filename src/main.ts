import { Plugin, Notice, TFile, MarkdownView, Editor } from "obsidian";
import {
  AliyunOSSPluginSettings,
  DEFAULT_SETTINGS,
  AliyunOSSSettingTab,
} from "./settings";
import { OSSService, UploadResult } from "./ossService";

export default class AliyunOSSUploadPlugin extends Plugin {
  settings: AliyunOSSPluginSettings;
  private ossService: OSSService | null = null;
  private activeNotices: Map<string, Notice> = new Map();

  async onload() {
    console.log("Aliyun OSS Upload 插件已加载");

    await this.loadSettings();

    // 初始化 OSS 服务
    this.ossService = new OSSService(this.settings);

    // 添加设置界面
    this.addSettingTab(new AliyunOSSSettingTab(this.app, this));

    // 注册拖拽图片处理 - 使用捕获阶段（必须，因为要阻止 Obsidian 保存本地文件）
    this.registerDomEvent(window, "drop", this.handleDrop.bind(this), true);

    // ⚠️ 关键修复：paste 事件不使用捕获阶段！
    // 在捕获阶段注册即使 return 也会影响事件流
    // 改用冒泡阶段，只在有图片时才拦截
    this.registerDomEvent(window, "paste", this.handlePaste.bind(this), false);

    console.log("Aliyun OSS Upload 插件初始化完成（支持拖拽和粘贴）");
  }

  onunload() {
    // 清理所有活跃的通知
    this.activeNotices.forEach(notice => notice.hide());
    this.activeNotices.clear();
    
    console.log("Aliyun OSS Upload 插件已卸载");
  }

  /**
   * 处理拖拽事件 - 在捕获阶段拦截
   */
  private async handleDrop(event: DragEvent): Promise<void> {
    // 立即阻止默认行为和传播
    event.preventDefault();
    event.stopPropagation();

    // 检查是否有文件
    if (!event.dataTransfer?.files) return;

    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      new Notice("请在 Markdown 编辑器中拖拽图片");
      return;
    }

    console.log(`[插件] 拦截拖拽事件：${imageFiles.length} 个图片文件`);

    for (const file of imageFiles) {
      await this.uploadImage(file, activeView.file, activeView.editor);
    }
  }

  /**
   * 处理粘贴事件 - 在冒泡阶段拦截（关键修复！）
   * 
   * 事件流：
   * 1. 捕获阶段：从 window 到 target
   * 2. 目标阶段：target 本身
   * 3. 冒泡阶段：从 target 到 window ← 我们在这里拦截
   * 
   * 好处：Obsidian 的默认处理在目标阶段完成
   * 如果有图片，我们在冒泡阶段拦截并上传
   * 如果没有图片，完全不影响
   */
  private async handlePaste(event: ClipboardEvent): Promise<void> {
    // 检查是否有剪贴板数据
    if (!event.clipboardData?.items) return;

    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));

    // ⚠️ 关键：如果没有图片，立即返回，完全不影响事件流
    if (imageItems.length === 0) {
      return;
    }

    // 只有在有图片时才拦截
    event.preventDefault();
    event.stopPropagation();

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) {
      // 不在 Markdown 编辑器中，不处理
      return;
    }

    // 获取当前编辑器光标位置
    const editor = activeView.editor;
    const cursor = editor.getCursor();

    console.log(`[插件] 拦截粘贴事件：${imageItems.length} 个剪贴板图片`);

    // 处理每个图片
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) {
        // 生成文件名（使用时间戳）
        const fileName = `pasted_${Date.now()}.${this.getFileExtension(file.type)}`;
        
        // 创建一个新的 File 对象，使用生成的文件名
        const newFile = new File([file], fileName, { type: file.type });
        
        // 上传并插入到光标位置
        await this.uploadImage(newFile, activeView.file, editor, cursor);
      }
    }
  }

  /**
   * 从 MIME 类型获取文件扩展名
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };
    return mimeToExt[mimeType] || 'png';
  }

  /**
   * 上传图片（带验证和错误处理）
   */
  private async uploadImage(
    file: File,
    targetFile: TFile | null,
    editor: Editor,
    cursor?: { line: number; ch: number }
  ): Promise<void> {
    if (!this.ossService) {
      new Notice("❌ OSS 服务未初始化，请检查插件配置");
      return;
    }

    // 验证文件
    const validation = this.ossService.validateFile(file);
    if (!validation.valid) {
      new Notice(`❌ ${validation.error}`);
      console.error(`[插件] 文件验证失败：${file.name}`, validation.error);
      return;
    }

    // 创建上传进度通知
    const noticeId = `upload_${file.name}_${Date.now()}`;
    const notice = new Notice(`📤 正在上传：${file.name}\n${(file.size / 1024).toFixed(1)} KB`, 0);
    this.activeNotices.set(noticeId, notice);

    console.log(`[插件] 开始上传：${file.name}`, {
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    try {
      // 读取文件内容
      const arrayBuffer = await this.arrayBufferFromFile(file);

      // 上传到 OSS
      const result: UploadResult = await this.ossService.uploadFile(
        file.name,
        arrayBuffer
      );

      // 清理通知
      this.activeNotices.delete(noticeId);
      notice.hide();

      if (result.success && result.url) {
        // 插入 Markdown 图片语法到文档
        const markdownImage = `![${file.name}](${result.url})`;
        
        // 如果指定了光标位置，在指定位置插入
        if (cursor) {
          editor.replaceRange(markdownImage + "\n", cursor);
          // 移动光标到插入文本之后
          const lines = (markdownImage + "\n").split("\n");
          const newLine = cursor.line + lines.length - 1;
          const newCh = lines.length > 1 
            ? lines[lines.length - 1].length 
            : cursor.ch + markdownImage.length + 1;
          editor.setCursor({ line: newLine, ch: newCh });
        } else {
          this.insertTextToEditor(editor, markdownImage + "\n");
        }
        
        // 显示成功通知
        const successNotice = new Notice(`✅ 上传成功：${file.name}\nURL: ${result.url}`, 5000);
        console.log(`[插件] 上传成功：${result.url}`);
      } else {
        // 显示错误通知
        const errorMsg = result.error || "未知错误";
        const errorNotice = new Notice(`❌ 上传失败：${errorMsg}`, 8000);
        
        // 如果是可重试错误，提供重试建议
        if (result.retryable) {
          console.warn(`[插件] 上传失败（可重试）：${errorMsg}`);
          const retryNotice = new Notice("💡 网络不稳定，建议稍后重试", 5000);
        } else {
          console.error(`[插件] 上传失败（不可重试）：${errorMsg}`, {
            errorCode: result.errorCode,
            fileName: file.name,
            fileSize: file.size,
          });
        }
      }
    } catch (error: any) {
      // 清理通知
      this.activeNotices.delete(noticeId);
      notice.hide();

      console.error("[插件] 上传异常:", {
        fileName: file.name,
        fileSize: file.size,
        error: error.message,
        stack: error.stack,
      });

      new Notice(`❌ 上传错误：${error.message}`, 8000);
    }
  }

  /**
   * 从 File 读取 ArrayBuffer
   */
  private arrayBufferFromFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => {
        const error = new Error("文件读取失败");
        console.error("[文件读取] 失败:", file.name, reader.error);
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 在编辑器当前光标位置插入文本
   */
  private insertTextToEditor(editor: Editor, text: string): void {
    const cursor = editor.getCursor();
    editor.replaceRange(text, cursor);
    
    // 移动光标到插入文本之后
    const lines = text.split("\n");
    const newLine = cursor.line + lines.length - 1;
    const newCh = lines.length > 1 
      ? lines[lines.length - 1].length 
      : cursor.ch + text.length;
    editor.setCursor({ line: newLine, ch: newCh });
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
    console.log("[插件] 设置已加载", {
      hasEndpoint: !!this.settings.endpoint,
      hasBucket: !!this.settings.bucket,
      pathPrefix: this.settings.pathPrefix,
    });
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // 更新 OSS 服务配置
    if (this.ossService) {
      this.ossService.updateSettings(this.settings);
    }
    console.log("[插件] 设置已保存");
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.ossService) {
      return { success: false, error: "OSS 服务未初始化" };
    }
    
    console.log("[插件] 开始连接测试...");
    const result = await this.ossService.testConnection();
    
    if (result.success) {
      console.log("[插件] 连接测试成功");
    } else {
      console.error("[插件] 连接测试失败:", result.error);
    }
    
    return result;
  }
}
