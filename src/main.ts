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

  async onload() {
    console.log("Aliyun OSS Upload 插件已加载");

    await this.loadSettings();

    // 初始化 OSS 服务
    this.ossService = new OSSService(this.settings);

    // 添加设置界面
    this.addSettingTab(new AliyunOSSSettingTab(this.app, this));

    // 注册拖拽图片处理
    this.registerDomEvent(document, "drop", this.handleDrop.bind(this));

    console.log("Aliyun OSS Upload 插件初始化完成");
  }

  onunload() {
    console.log("Aliyun OSS Upload 插件已卸载");
  }

  private async handleDrop(event: DragEvent): Promise<void> {
    // 检查是否有文件
    if (!event.dataTransfer?.files) return;

    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;

    // 检查是否在编辑器中
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    event.preventDefault();
    event.stopPropagation();

    // 处理每个图片文件
    for (const file of imageFiles) {
      await this.uploadImage(file, activeView.file, activeView.editor);
    }
  }

  private async uploadImage(
    file: File,
    targetFile: TFile | null,
    editor: Editor
  ): Promise<void> {
    if (!this.ossService) {
      new Notice("OSS 服务未初始化");
      return;
    }

    const notice = new Notice(`正在上传：${file.name}`, 0);

    try {
      // 读取文件内容
      const arrayBuffer = await this.arrayBufferFromFile(file);

      // 上传到 OSS
      const result: UploadResult = await this.ossService.uploadFile(
        file.name,
        arrayBuffer
      );

      if (result.success && result.url) {
        // 插入 Markdown 图片语法到文档
        const markdownImage = `![${file.name}](${result.url})`;
        this.insertTextToEditor(editor, markdownImage);
        notice.setMessage(`上传成功：${file.name}`);
        setTimeout(() => notice.hide(), 3000);
      } else {
        notice.setMessage(`上传失败：${result.error}`);
        setTimeout(() => notice.hide(), 5000);
      }
    } catch (error: any) {
      console.error("上传图片失败:", error);
      notice.setMessage(`上传错误：${error.message}`);
      setTimeout(() => notice.hide(), 5000);
    }
  }

  private arrayBufferFromFile(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

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
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // 更新 OSS 服务配置
    if (this.ossService) {
      this.ossService.updateSettings(this.settings);
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.ossService) {
      return { success: false, error: "OSS 服务未初始化" };
    }
    return await this.ossService.testConnection();
  }
}
