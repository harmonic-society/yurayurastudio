// Google Drive API設定
// 本番環境で環境変数が読み込まれない場合のフォールバック

export const googleDriveConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

// デバッグ情報
if (!googleDriveConfig.apiKey || !googleDriveConfig.clientId) {
  console.warn('Google Drive API configuration is missing:', {
    apiKey: !!googleDriveConfig.apiKey,
    clientId: !!googleDriveConfig.clientId,
    env: import.meta.env.MODE,
    allEnvKeys: Object.keys(import.meta.env)
  });
}

export const isGoogleDriveConfigured = () => {
  return !!(googleDriveConfig.apiKey && googleDriveConfig.clientId);
};