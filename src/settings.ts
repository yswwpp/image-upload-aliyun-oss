import { PluginSettingTab, App, Setting, Notice } from "obsidian";
import AliyunOSSUploadPlugin from "./main";

export interface AliyunOSSPluginSettings {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  pathPrefix: string;
  useEnvVariables: boolean;
}

export const DEFAULT_SETTINGS: AliyunOSSPluginSettings = {
  endpoint: "",
  bucket: "",
  accessKeyId: "",
  accessKeySecret: "",
  pathPrefix: "obsidian-images/",
  useEnvVariables: false,
};

export class AliyunOSSSettingTab extends PluginSettingTab {
  plugin: AliyunOSSUploadPlugin;

  constructor(app: App, plugin: AliyunOSSUploadPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "阿里云 OSS 图片上传设置" });

    // 环境变量选项
    new Setting(containerEl)
      .setName("使用环境变量")
      .setDesc("启用后将从系统环境变量读取 OSS 配置 (ALIYUN_OSS_*)")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useEnvVariables)
          .onChange(async (value) => {
            this.plugin.settings.useEnvVariables = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!this.plugin.settings.useEnvVariables) {
      // Endpoint
      new Setting(containerEl)
        .setName("Endpoint")
        .setDesc("阿里云 OSS Endpoint，如：oss-cn-hangzhou.aliyuncs.com")
        .addText((text) =>
          text
            .setPlaceholder("oss-cn-hangzhou.aliyuncs.com")
            .setValue(this.plugin.settings.endpoint)
            .onChange(async (value) => {
              this.plugin.settings.endpoint = value;
              await this.plugin.saveSettings();
            })
        );

      // Bucket
      new Setting(containerEl)
        .setName("Bucket")
        .setDesc("OSS Bucket 名称")
        .addText((text) =>
          text
            .setPlaceholder("your-bucket-name")
            .setValue(this.plugin.settings.bucket)
            .onChange(async (value) => {
              this.plugin.settings.bucket = value;
              await this.plugin.saveSettings();
            })
        );

      // AccessKey ID
      new Setting(containerEl)
        .setName("AccessKey ID")
        .setDesc("阿里云 AccessKey ID")
        .addText((text) =>
          text
            .setPlaceholder("LTAI5t...")
            .setValue(this.plugin.settings.accessKeyId)
            .onChange(async (value) => {
              this.plugin.settings.accessKeyId = value;
              await this.plugin.saveSettings();
            })
        );

      // AccessKey Secret
      new Setting(containerEl)
        .setName("AccessKey Secret")
        .setDesc("阿里云 AccessKey Secret")
        .addText((text) =>
          text
            .setPlaceholder("your-access-key-secret")
            .setValue(this.plugin.settings.accessKeySecret)
            .onChange(async (value) => {
              this.plugin.settings.accessKeySecret = value;
              await this.plugin.saveSettings();
            })
        );
    } else {
      // 显示环境变量提示
      const infoEl = containerEl.createEl("div", {
        cls: "setting-item-description",
      });
      infoEl.innerHTML = `
        <p>将从以下环境变量读取配置：</p>
        <ul>
          <li><code>ALIYUN_OSS_ENDPOINT</code></li>
          <li><code>ALIYUN_OSS_BUCKET</code></li>
          <li><code>ALIYUN_OSS_ACCESS_KEY_ID</code></li>
          <li><code>ALIYUN_OSS_ACCESS_KEY_SECRET</code></li>
        </ul>
        <p><strong>注意：</strong>需要在启动 Obsidian 前设置这些环境变量</p>
      `;
    }

    // 路径前缀
    new Setting(containerEl)
      .setName("上传路径前缀")
      .setDesc("图片在 OSS 中的存储路径前缀，如：obsidian-images/")
      .addText((text) =>
        text
          .setPlaceholder("obsidian-images/")
          .setValue(this.plugin.settings.pathPrefix)
          .onChange(async (value) => {
            this.plugin.settings.pathPrefix = value;
            await this.plugin.saveSettings();
          })
        );

    // 测试连接按钮
    new Setting(containerEl)
      .setName("测试连接")
      .setDesc("测试 OSS 配置是否正确")
      .addButton((button) =>
        button
          .setButtonText("测试")
          .onClick(async () => {
            const result = await this.plugin.testConnection();
            if (result.success) {
              new Notice("OSS 连接成功！");
            } else {
              new Notice(`OSS 连接失败：${result.error}`);
            }
          })
      );
  }
}
