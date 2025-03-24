// Replitデプロイ専用スクリプト
console.log('Replit本番デプロイスクリプトを実行中...');

// 本番環境であることを明示的に設定
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '8080';

// アプリケーションの起動
console.log(`環境変数: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
console.log('アプリケーションを本番モードで起動します...');

// NodeのESM形式でサーバーを実行
import('./dist/index.js').catch(err => {
  console.error('アプリケーション起動エラー:', err);
  process.exit(1);
});