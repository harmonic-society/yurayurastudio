/**
 * Capacitor設定ファイルを更新するスクリプト
 * 開発環境用と本番環境用の設定を切り替えます
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modulesで__dirnameを使用するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'capacitor.config.ts');

// コマンドライン引数を取得
const args = process.argv.slice(2);
const mode = args[0] || 'dev'; // デフォルトは開発モード
const customHost = args[1]; // カスタムホスト名（オプション）

// 設定ファイルを読み込み
let config = fs.readFileSync(configPath, 'utf8');

// 現在の設定を確認
console.log('現在の設定:');
const currentHostname = config.match(/hostname: ['"]([^'"]+)['"]/);
if (currentHostname) {
  console.log(`ホスト名: ${currentHostname[1]}`);
}

// モードに応じて設定を更新
if (mode === 'prod' || mode === 'production') {
  // 本番環境用の設定
  const productionHost = customHost || 'app.yurayurastudio.com';
  
  // コメントアウトされている本番設定を有効化し、開発設定をコメントアウト
  config = config.replace(
    /\/\/\s*hostname: ['"]([^'"]+)['"]/,
    `hostname: '${productionHost}'`
  );
  
  config = config.replace(
    /hostname: ['"]([^'"]+)['"]/,
    `// hostname: '$1'`
  );
  
  // コメントを整理（二重コメントを解消）
  config = config.replace(/\/\/\s*\/\/\s*hostname/, '// hostname');
  
  console.log(`\n✅ 本番環境用に設定を更新しました:
- ホスト名: ${productionHost}
- Android Scheme: https`);
  
} else {
  // 開発環境用の設定
  const devHost = customHost || 'localhost:5000';
  
  // 本番設定をコメントアウトし、開発設定を有効化
  config = config.replace(
    /hostname: ['"]([^'"]+)['"]/,
    `// hostname: '$1'`
  );
  
  config = config.replace(
    /\/\/\s*hostname: ['"]([^'"]+)['"]/,
    `hostname: '${devHost}'`
  );
  
  // コメントを整理（二重コメントを解消）
  config = config.replace(/\/\/\s*\/\/\s*hostname/, '// hostname');
  
  console.log(`\n✅ 開発環境用に設定を更新しました:
- ホスト名: ${devHost}
- Android Scheme: https (cleartext有効)`);
}

// 変更を保存
fs.writeFileSync(configPath, config);
console.log('\n🔄 capacitor.config.tsを更新しました。次のコマンドを実行して変更を反映してください:');
console.log('npx cap sync android');