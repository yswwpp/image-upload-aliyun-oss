declare module 'ali-oss' {
  interface Options {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    secure?: boolean;
    endpoint?: string;
  }

  interface PutResult {
    name: string;
    url: string;
    etag: string;
    res: any;
  }

  interface ListOptions {
    'max-keys'?: number;
    prefix?: string;
    marker?: string;
  }

  interface ListResult {
    objects: any[];
    prefixes: string[];
    isTruncated: boolean;
    nextMarker: string;
  }

  class OSS {
    constructor(options: Options);
    put(object: string, content: Buffer): Promise<PutResult>;
    list(options?: ListOptions): Promise<ListResult>;
    delete(object: string): Promise<any>;
    signatureUrl(object: string, options?: any): string;
  }

  export = OSS;
  export as namespace OSS;
}
