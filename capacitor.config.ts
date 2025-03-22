import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yurayura.studio',
  appName: 'Yura Yura STUDIO',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // デプロイ時は本番ホスト名に変更します
    // hostname: 'app.yurayurastudio.com'
    // 開発時はローカルサーバーを使用します（実際のIPアドレスに変更してください）
    hostname: 'localhost:5000'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#4F46E5",
      showSpinner: true,
      spinnerColor: "#FFFFFF"
    }
  }
};

export default config;
