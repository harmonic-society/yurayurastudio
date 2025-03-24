#!/bin/bash

# 本番環境変数を設定
export NODE_ENV=production

# 必要なパッケージが全てインストールされていることを確認
echo "依存関係を確認中..."
npm install

# クライアントサイドをビルド
echo "フロントエンドをビルド中..."
npm run build

# サーバーの起動
echo "本番モードでサーバーを起動中..."
npm run start