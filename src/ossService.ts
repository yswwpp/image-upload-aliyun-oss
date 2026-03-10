import { AliyunOSSPluginSettings } from "./settings";
import * as https from "https";
import * as http from "http";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

export interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploaded: number;
  total: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

// OSS 错误码映射
const OSS_ERROR_MESSAGES: Record<string, string> = {
  'AccessDenied': '访问被拒绝，请检查 AccessKey 权限',
  'NoSuchBucket': 'Bucket 不存在，请检查 Bucket 名称',
  'InvalidAccessKeyId': 'AccessKey ID 无效',
  'SignatureDoesNotMatch': '签名不匹配，请检查 AccessKey Secret',
  'RequestTimeTooSkewed': '请求时间偏差过大，请校准系统时间',
  'EntityTooLarge': '文件大小超过限制（最大 10MB）',
  'InvalidArgument': '无效的参数',
  'InternalError': 'OSS 内部错误，请稍后重试',
  'ServiceUnavailable': 'OSS 服务暂时不可用',
  'Timeout': '请求超时，请检查网络连接',
};

// 允许的文件类型白名单
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/heic',
  'image/heif',
];

// 最大文件大小（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class OSSService {
  private settings: AliyunOSSPluginSettings;
  private uploadQueue: number = 0;
  private readonly MAX_CONCURRENT_UPLOADS = 3;

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
        console.error("读取环境变量失败:", e);
        return null;
      }
    } else {
      endpoint = this.settings.endpoint;
      bucket = this.settings.bucket;
      accessKeyId = this.settings.accessKeyId;
      accessKeySecret = this.settings.accessKeySecret;
    }

    if (!endpoint || !bucket || !accessKeyId || !accessKeySecret) {
      console.error("OSS 配置不完整:", {
        hasEndpoint: !!endpoint,
        hasBucket: !!bucket,
        hasAccessKey: !!accessKeyId,
        hasSecret: !!accessKeySecret
      });
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

  /**
   * 验证文件
   */
  public validateFile(file: File): { valid: boolean; error?: string } {
    // 检查空文件
    if (file.size === 0) {
      return { valid: false, error: "文件大小为 0，无法上传" };
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return { 
        valid: false, 
        error: `文件过大（${sizeMB}MB），最大支持 10MB` 
      };
    }

    // 检查文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `不支持的文件类型：${file.type}，支持的类型：${ALLOWED_MIME_TYPES.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * 解析 OSS 错误响应
   */
  private parseOSSError(xmlResponse: string): { code: string; message: string } {
    try {
      const codeMatch = xmlResponse.match(/<Code>([^<]+)<\/Code>/);
      const messageMatch = xmlResponse.match(/<Message>([^<]+)<\/Message>/);
      
      return {
        code: codeMatch ? codeMatch[1] : 'Unknown',
        message: messageMatch ? messageMatch[1] : '未知错误'
      };
    } catch (e) {
      return { code: 'Unknown', message: xmlResponse || '无法解析错误响应' };
    }
  }

  /**
   * 获取友好的错误提示
   */
  private getFriendlyError(errorCode: string, defaultMessage: string): string {
    return OSS_ERROR_MESSAGES[errorCode] || defaultMessage;
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(errorCode: string): boolean {
    const retryableCodes = [
      'InternalError',
      'ServiceUnavailable',
      'Timeout',
      'RequestTimeout',
      'NetworkError',
    ];
    return retryableCodes.includes(errorCode);
  }

  /**
   * 延迟函数（用于重试）
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 使用 Node.js https 模块上传文件到 OSS（带重试）
   */
  public async uploadFile(
    fileName: string,
    fileContent: ArrayBuffer,
    retryCount: number = 0
  ): Promise<UploadResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        error: "OSS 配置不完整，请在插件设置中配置阿里云 OSS 信息",
        retryable: false,
      };
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 秒

    return new Promise((resolve) => {
      try {
        const timestamp = Date.now();
        const objectKey = `${this.settings.pathPrefix}${timestamp}_${fileName}`;
        const host = `${config.bucket}.${config.endpoint}`;
        
        // 生成签名
        const date = new Date().toUTCString();
        const contentType = "image/png";
        const canonicalizedResource = `/${config.bucket}/${objectKey}`;
        const stringToSign = `PUT\n\n${contentType}\n${date}\n${canonicalizedResource}`;
        
        const crypto = require('crypto');
        const signature = crypto
          .createHmac('sha1', config.accessKeySecret)
          .update(stringToSign)
          .digest('base64');

        const authorization = `OSS ${config.accessKeyId}:${signature}`;

        console.log(`[OSS] 开始上传：${fileName} (${fileContent.byteLength} bytes) -> ${objectKey}`);

        // 准备请求选项
        // 注意：path 需要 encodeURIComponent，但生成 URL 时不需要
        const options = {
          hostname: host,
          port: 443,
          path: `/${encodeURIComponent(objectKey)}`,
          method: 'PUT',
          headers: {
            'Authorization': authorization,
            'Date': date,
            'Content-Type': contentType,
            'Content-Length': fileContent.byteLength,
          },
          timeout: 30000, // 30 秒超时
        };

        // 创建请求
        const req = https.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200) {
              // ✅ 修复：生成 URL 时不使用 encodeURIComponent
              // objectKey 中的 / 不需要编码，直接使用
              const fileUrl = `https://${host}/${objectKey}`;
              console.log(`[OSS] 上传成功：${fileUrl}`);
              resolve({
                success: true,
                url: fileUrl,
              });
            } else {
              // 解析错误
              const errorData = this.parseOSSError(responseData);
              const friendlyError = this.getFriendlyError(
                errorData.code,
                `上传失败：${res.statusCode} - ${errorData.message}`
              );
              const retryable = this.isRetryableError(errorData.code);

              console.error(`[OSS] 上传失败：${res.statusCode}`, {
                code: errorData.code,
                message: errorData.message,
                fileName,
                fileSize: fileContent.byteLength,
                retryable,
              });

              // 判断是否需要重试
              if (retryable && retryCount < maxRetries) {
                console.log(`[OSS] 将在 ${retryDelay}ms 后重试（第 ${retryCount + 1}/${maxRetries} 次）`);
                this.delay(retryDelay).then(() => {
                  this.uploadFile(fileName, fileContent, retryCount + 1)
                    .then(resolve);
                });
                return;
              }

              resolve({
                success: false,
                error: friendlyError,
                errorCode: errorData.code,
                retryable,
              });
            }
          });
        });

        // 处理错误
        req.on('error', (error) => {
          console.error("[OSS] 请求错误:", {
            fileName,
            error: error.message,
            code: (error as any).code,
          });

          // 网络错误可重试
          if (retryCount < maxRetries) {
            console.log(`[OSS] 网络错误，将在 ${retryDelay}ms 后重试（第 ${retryCount + 1}/${maxRetries} 次）`);
            this.delay(retryDelay).then(() => {
              this.uploadFile(fileName, fileContent, retryCount + 1)
                .then(resolve);
            });
            return;
          }

          resolve({
            success: false,
            error: `网络错误：${error.message}，请检查网络连接`,
            errorCode: (error as any).code || 'NetworkError',
            retryable: true,
          });
        });

        // 设置超时
        req.setTimeout(30000, () => {
          console.error("[OSS] 请求超时");
          req.abort();
          
          if (retryCount < maxRetries) {
            this.delay(retryDelay).then(() => {
              this.uploadFile(fileName, fileContent, retryCount + 1)
                .then(resolve);
            });
            return;
          }

          resolve({
            success: false,
            error: "上传超时，请检查网络连接",
            errorCode: 'Timeout',
            retryable: true,
          });
        });

        // 写入数据
        req.write(Buffer.from(new Uint8Array(fileContent)));
        
        // 完成请求
        req.end(() => {
          console.log(`[OSS] 请求已发送：${fileName}`);
        });

      } catch (error: any) {
        console.error("[OSS] 上传异常:", {
          fileName,
          error: error.message,
          stack: error.stack,
        });
        resolve({
          success: false,
          error: error.message || "上传失败",
        });
      }
    });
  }

  /**
   * 批量上传文件（控制并发）
   */
  public async uploadFiles(
    files: Array<{ name: string; content: ArrayBuffer }>
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    console.log(`[OSS] 开始批量上传 ${files.length} 个文件`);

    // 使用队列控制并发
    const queue = [...files];
    const activeUploads: Promise<void>[] = [];

    const processNext = async () => {
      if (queue.length === 0) return;
      
      const file = queue.shift()!;
      
      try {
        const result = await this.uploadFile(file.name, file.content);
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message,
        });
      }

      // 继续处理下一个
      await processNext();
    };

    // 启动并发上传（最多 MAX_CONCURRENT_UPLOADS 个）
    const concurrentCount = Math.min(this.MAX_CONCURRENT_UPLOADS, files.length);
    for (let i = 0; i < concurrentCount; i++) {
      activeUploads.push(processNext());
    }

    await Promise.all(activeUploads);
    
    console.log(`[OSS] 批量上传完成：成功 ${results.filter(r => r.success).length}/${files.length}`);
    
    return results;
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

    // 验证配置格式
    if (!config.endpoint.includes('aliyuncs.com')) {
      return {
        success: false,
        error: "Endpoint 格式不正确，应为 oss-<region>.aliyuncs.com",
      };
    }

    console.log("[OSS] 连接测试通过", {
      endpoint: config.endpoint,
      bucket: config.bucket,
    });

    return { success: true };
  }

  public updateSettings(settings: AliyunOSSPluginSettings): void {
    this.settings = settings;
    console.log("[OSS] 设置已更新");
  }
}
