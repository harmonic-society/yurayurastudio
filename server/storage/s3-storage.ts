import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-2';
    this.bucketName = process.env.AWS_S3_BUCKET || 'yurayurastudio';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    console.log(`S3 Storage initialized for bucket: ${this.bucketName} in region: ${region}`);
  }

  /**
   * ファイルをS3にアップロード
   * @param file - アップロードするファイルのBuffer
   * @param filename - ファイル名
   * @param contentType - ファイルのMIMEタイプ
   * @returns アップロードされたファイルの情報
   */
  async uploadFile(file: Buffer, filename: string, contentType: string) {
    try {
      // ファイル名をユニークにする
      const uniqueFilename = `uploads/${Date.now()}-${filename}`;
      
      console.log('S3 upload attempt:', uniqueFilename);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: uniqueFilename,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      console.log('S3 upload success:', uniqueFilename);

      return {
        filename: uniqueFilename,
        url: await this.getFileUrl(uniqueFilename),
        contentType: contentType,
        size: file.length
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  /**
   * ファイルのURLを取得（署名付きURL）
   * @param filename - ファイル名
   * @returns ファイルのアクセスURL
   */
  async getFileUrl(filename: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      // 1時間有効な署名付きURLを生成
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error('URL generation error:', error);
      // フォールバックとしてAPIエンドポイントを返す
      return `/api/files/${encodeURIComponent(filename)}`;
    }
  }

  /**
   * ファイルをダウンロード
   * @param filename - ファイル名
   * @returns ファイルのBuffer
   */
  async downloadFile(filename: string): Promise<Buffer> {
    try {
      console.log(`Attempting to download file from S3: ${filename}`);
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('ファイルの内容が空です');
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      console.log(`Downloaded file ${filename} from S3, size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('S3 download error:', error);
      throw error;
    }
  }

  /**
   * ファイルを削除
   * @param filename - ファイル名
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.s3Client.send(command);
      console.log(`Deleted file ${filename} from S3`);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  /**
   * 保存されているファイルの一覧を取得
   * @returns ファイルリスト
   */
  async listFiles(): Promise<string[]> {
    try {
      const command = new ListObjectsCommand({
        Bucket: this.bucketName,
        Prefix: 'uploads/',
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents
        .filter(obj => obj.Key)
        .map(obj => obj.Key as string);
    } catch (error) {
      console.error('S3 list error:', error);
      throw error;
    }
  }

  /**
   * ファイルが存在するかチェック
   * @param filename - ファイル名
   * @returns ファイルが存在するかどうか
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * ファイルサイズを取得
   * @param filename - ファイル名
   * @returns ファイルサイズ（バイト）
   */
  async getFileSize(filename: string): Promise<number> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });

      const response = await this.s3Client.send(command);
      return response.ContentLength || 0;
    } catch (error) {
      console.error('S3 file size error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const s3Storage = new S3StorageService();