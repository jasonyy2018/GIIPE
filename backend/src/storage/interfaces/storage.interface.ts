export interface StorageProvider {
  upload(file: any, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  getFile(path: string): Promise<Buffer>;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
}