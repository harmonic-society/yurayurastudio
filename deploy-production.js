#!/usr/bin/env node

/**
 * 本番環境用の軽量デプロイメントスクリプト
 * ビルドタイムアウトを回避し、Replit Deploymentsでの成功率を向上させます
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const runCommand = (command, options = {}) => {
  log(`実行中: ${command}`);
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      timeout: 300000, // 5分のタイムアウト
      ...options 
    });
  } catch (error) {
    log(`エラー: ${error.message}`);
    throw error;
  }
};

async function main() {
  try {
    log('🚀 本番環境デプロイメント開始');
    
    // 環境変数の設定
    process.env.NODE_ENV = 'production';
    process.env.VITE_BUILD_TIMEOUT = '300000';
    
    // distディレクトリの作成
    if (!existsSync('./dist')) {
      mkdirSync('./dist', { recursive: true });
    }
    
    log('📦 フロントエンドをビルド中...');
    runCommand('npx vite build --mode production', {
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    log('🔧 バックエンドをビルド中...');
    runCommand('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify');
    
    log('✅ ビルド完了');
    
    // 本番環境でのサーバー起動
    if (process.env.START_SERVER === 'true') {
      log('🚀 本番サーバーを起動中...');
      runCommand('node dist/index.js');
    }
    
  } catch (error) {
    log(`❌ デプロイメントエラー: ${error.message}`);
    process.exit(1);
  }
}

main();