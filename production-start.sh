#!/bin/bash

# 本番環境向けビルドスクリプト

# 実行環境を表示
echo "=========================================="
echo "Replit Production Deployment Script"
echo "=========================================="
echo "NODE_ENV: production"
echo "=========================================="

# 常に本番環境に設定
export NODE_ENV=production

# ビルドプロセスを実行
echo "アプリケーションをビルドします..."
npm run build

# ビルド結果を確認
if [ $? -ne 0 ]; then
  echo "ビルドに失敗しました。"
  exit 1
fi

echo "ビルド完了、アプリケーションを起動します..."
# node index.js でエントリポイントを実行
node --experimental-modules index.js