import { ObjectStorageService, objectStorage } from './object-storage.js';
import { S3StorageService, s3Storage } from './s3-storage.js';

// ストレージサービスのインターフェース
export interface StorageService {
  uploadFile(file: Buffer, filename: string, contentType: string): Promise<{
    filename: string;
    url: string;
    contentType: string;
    size: number;
  }>;
  getFileUrl(filename: string): Promise<string>;
  downloadFile(filename: string): Promise<Buffer>;
  deleteFile(filename: string): Promise<void>;
  listFiles(): Promise<string[]>;
  fileExists(filename: string): Promise<boolean>;
  getFileSize(filename: string): Promise<number>;
}

// 環境に応じて適切なストレージサービスを選択
function getStorageService(): StorageService {
  // AWS S3が設定されている場合はS3を使用
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) {
    console.log('Using S3 storage service');
    return s3Storage;
  }
  
  // Replit環境の場合はObject Storageを使用
  if (process.env.REPL_ID || process.env.REPLIT_DB_URL) {
    console.log('Using Replit Object Storage service');
    return objectStorage;
  }
  
  // それ以外の場合はS3をデフォルトとする（エラーになる可能性あり）
  console.warn('No storage service properly configured. Attempting to use S3.');
  return s3Storage;
}

// エクスポート
export const storageService = getStorageService();
export { ObjectStorageService, S3StorageService };