#!/bin/bash

# 本番環境変数を設定
export NODE_ENV=production
export PORT=8080

echo "=========================="
echo "本番環境デプロイスクリプト"
echo "=========================="
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "=========================="

# フロントエンドをビルド
echo "フロントエンドのビルドを開始します..."
NODE_ENV=production npm run build

# 本番サーバーを起動
echo "本番モードでサーバーを起動します..."
NODE_ENV=production npm run start