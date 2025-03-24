// Replitデプロイ専用のトップレベルエントリポイント

// 本番環境であることを明示
process.env.NODE_ENV = 'production';

// Replitのデプロイ環境でPORTが8080になるように設定
if (!process.env.PORT) {
  process.env.PORT = '8080';
}

console.log('========================================');
console.log('Replit Production Deployment Entrypoint');
console.log('========================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);
console.log('========================================');

// 実行環境の確認
if (process.env.REPL_ID && process.env.REPL_OWNER) {
  console.log(`Replit環境で実行中: ${process.env.REPL_OWNER}/${process.env.REPL_ID}`);
}

// サーバー実行
console.log('アプリケーションを起動します...');
import('./dist/index.js').catch(err => {
  console.error('アプリケーション起動エラー:', err);
  process.exit(1);
});