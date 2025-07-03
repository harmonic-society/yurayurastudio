#!/bin/bash

# 本番環境用起動スクリプト
echo "本番環境でアプリケーションを起動中..."

# 環境変数を設定
export NODE_ENV=production

# アプリケーションをビルド
echo "アプリケーションをビルド中..."
npm run build

# ビルドが成功したかチェック
if [ $? -ne 0 ]; then
    echo "ビルドに失敗しました"
    exit 1
fi

# 本番サーバーを起動
echo "本番サーバーを起動中..."
npm start