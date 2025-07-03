/**
 * 本番環境デプロイメント用スクリプト
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🚀 本番環境デプロイメントを開始します...');

try {
  // 環境変数を設定
  process.env.NODE_ENV = 'production';
  
  console.log('📦 依存関係をインストール中...');
  execSync('npm ci --only=production', { stdio: 'inherit' });
  
  console.log('🔨 アプリケーションをビルド中...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // ビルド成果物の確認
  if (!existsSync('./dist')) {
    throw new Error('ビルドディレクトリが見つかりません');
  }
  
  console.log('✅ ビルドが完了しました');
  console.log('🏃 本番サーバーを起動中...');
  
  // 本番サーバーを起動
  execSync('npm start', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ デプロイメントに失敗しました:', error.message);
  process.exit(1);
}