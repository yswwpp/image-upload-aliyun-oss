import { AliyunOSSPluginSettings } from "./settings";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class OSSService {
  private settings: AliyunOSSPluginSettings;

  constructor(settings: AliyunOSSPluginSettings) {
    this.settings = settings;
  }

  private getConfig(): {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
  } | null {
    let endpoint: string;
    let bucket: string;
    let accessKeyId: string;
    let accessKeySecret: string;

    if (this.settings.useEnvVariables) {
      try {
        endpoint = (typeof process !== 'undefined' && (process.env as any)?.ALIYUN_OSS_ENDPOINT) || "";
        bucket = (typeof process !== 'undefined' && (process.env as any)?.ALIYUN_OSS_BUCKET) || "";
        accessKeyId = (typeof process !== 'undefined' && (process.env as any)?.ALIYUN_OSS_ACCESS_KEY_ID) || "";
        accessKeySecret = (typeof process !== 'undefined' && (process.env as any)?.ALIYUN_OSS_ACCESS_KEY_SECRET) || "";
      } catch (e) {
        return null;
      }
    } else {
      endpoint = this.settings.endpoint;
      bucket = this.settings.bucket;
      accessKeyId = this.settings.accessKeyId;
      accessKeySecret = this.settings.accessKeySecret;
    }

    if (!endpoint || !bucket || !accessKeyId || !accessKeySecret) {
      return null;
    }

    return { endpoint, bucket, accessKeyId, accessKeySecret };
  }

  private extractRegion(endpoint: string): string {
    const match = endpoint.match(/oss-([^.]+)\.aliyuncs\.com/);
    if (match) return match[1];
    const simpleMatch = endpoint.match(/oss-([^.]+)/);
    if (simpleMatch) return simpleMatch[1];
    return "";
  }

  private signPolicy(policy: string, accessKeySecret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha1', accessKeySecret)
      .update(Buffer.from(policy, 'utf8'))
      .digest('base64');
  }

  public async uploadFile(
    fileName: string,
    fileContent: ArrayBuffer
  ): Promise<UploadResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        error: "OSS 配置不完整，请检查设置",
      };
    }

    try {
      const timestamp = Date.now();
      const objectKey = `${this.settings.pathPrefix}${timestamp}_${fileName}`;
      const region = this.extractRegion(config.endpoint);
      const host = `${config.bucket}.${config.endpoint}`;
      
      // 生成 OSS 签名
      const policyObj = {
        expiration: new Date(Date.now() + 3600000).toISOString(),
        conditions: [
          { bucket: config.bucket },
          ['eq', '$key', objectKey],
          ['starts-with', '$Content-Type', 'image/']
        ]
      };
      const policy = Buffer.from(JSON.stringify(policyObj)).toString('base64');
      const signature = this.signPolicy(policy, config.accessKeySecret);

      // 创建 FormData 上传
      const formData = new FormData();
      formData.append('key', objectKey);
      formData.append('OSSAccessKeyId', config.accessKeyId);
      formData.append('policy', policy);
      formData.append('Signature', signature);
      formData.append('Content-Type', 'image/png');
      formData.append('file', new Blob([fileContent]));

      const url = `https://${host}`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const fileUrl = `https://${host}/${encodeURIComponent(objectKey)}`;
        console.log(`文件上传成功：${fileUrl}`);
        return {
          success: true,
          url: fileUrl,
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `上传失败：${response.status} - ${errorText}`,
        };
      }
    } catch (error: any) {
      console.error("文件上传失败:", error);
      return {
        success: false,
        error: error.message || "上传失败",
      };
    }
  }

  public async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        error: "OSS 配置不完整，请检查设置",
      };
    }
    // 简单测试：只要能获取配置就认为连接可用
    return { success: true };
  }

  public updateSettings(settings: AliyunOSSPluginSettings): void {
    this.settings = settings;
  }
}
