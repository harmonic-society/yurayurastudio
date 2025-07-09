#!/bin/bash

# 本番環境用起動スクリプト
echo "本番環境でアプリケーションを起動中..."

# 環境変数を設定
export NODE_ENV=production

# 軽量デプロイメントスクリプトを実行
echo "軽量デプロイメントを実行中..."
node deploy-production.js