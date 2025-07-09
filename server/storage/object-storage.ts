import { Client } from "@replit/object-storage";

export class ObjectStorageService {
  private client: Client;
  private bucketName = "yurayurastudio";

  constructor() {
    try {
      this.client = new Client();
      console.log(`Object Storage initialized for bucket: ${this.bucketName}`);
    } catch (error) {
      console.error('Object Storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * ファイルをObject Storageにアップロード
   * @param file - アップロードするファイルのBuffer
   * @param filename - ファイル名
   * @param contentType - ファイルのMIMEタイプ
   * @returns アップロードされたファイルの情報
   */
  async uploadFile(file: Buffer, filename: string, contentType: string) {
    try {
      // ファイル名をユニークにする
      const uniqueFilename = `${Date.now()}-${filename}`;
      
      console.log('Object Storage upload attempt:', uniqueFilename);
      
      // Object Storageにファイルをアップロード
      const result = await this.client.uploadFromBytes(uniqueFilename, file);

      if (!result.ok) {
        throw new Error(`ファイルアップロードに失敗しました: ${result.error?.message}`);
      }

      console.log('Object Storage upload success:', uniqueFilename);

      return {
        filename: uniqueFilename,
        url: await this.getFileUrl(uniqueFilename),
        contentType: contentType,
        size: file.length
      };
    } catch (error) {
      console.error('Object Storage upload error:', error);
      throw error;
    }
  }

  /**
   * ファイルのURLを取得（Object Storageから直接ダウンロード用のエンドポイント）
   * @param filename - ファイル名
   * @returns ファイルのアクセスURL
   */
  async getFileUrl(filename: string): Promise<string> {
    try {
      // Object StorageのファイルはAPIを通じて提供
      return `/api/files/${filename}`;
    } catch (error) {
      console.error('URL generation error:', error);
      throw error;
    }
  }

  /**
   * ファイルをダウンロード
   * @param filename - ファイル名
   * @returns ファイルのBuffer
   */
  async downloadFile(filename: string): Promise<Buffer> {
    try {
      console.log(`Attempting to download file: ${filename}`);
      const result = await this.client.downloadAsBytes(filename);
      
      if (!result.ok) {
        console.error(`Download failed for ${filename}:`, result.error);
        throw new Error(`ファイルダウンロードに失敗しました: ${result.error?.message || 'Unknown error'}`);
      }

      const buffer = Buffer.from(result.value);
      console.log(`Downloaded file ${filename}, size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('Object Storage download error:', error);
      throw error;
    }
  }

  /**
   * ファイルを削除
   * @param filename - ファイル名
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const result = await this.client.delete(filename);
      
      if (!result.ok) {
        throw new Error(`ファイル削除に失敗しました: ${result.error?.message}`);
      }
    } catch (error) {
      console.error('Object Storage delete error:', error);
      throw error;
    }
  }

  /**
   * 保存されているファイルの一覧を取得
   * @returns ファイルリスト
   */
  async listFiles(): Promise<string[]> {
    try {
      const result = await this.client.list();
      
      if (!result.ok) {
        throw new Error(`ファイル一覧の取得に失敗しました: ${result.error?.message}`);
      }

      return result.value.map(obj => obj.name);
    } catch (error) {
      console.error('Object Storage list error:', error);
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
      const result = await this.client.exists(filename);
      return result.ok && result.value;
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
      const result = await this.client.downloadAsBytes(filename);
      
      if (!result.ok) {
        throw new Error(`ファイル情報の取得に失敗しました: ${result.error?.message}`);
      }

      return result.value.length;
    } catch (error) {
      console.error('Object Storage file size error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const objectStorage = new ObjectStorageService();