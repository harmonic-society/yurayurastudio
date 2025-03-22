#!/bin/bash

# エラー時に終了するように設定
set -e

echo "📱 Androidアプリの実行を開始します..."

# 最新のWebアプリを同期
echo "🔄 Capacitorの設定を同期中..."
npx cap sync android

# Androidアプリを起動
echo "▶️ Androidアプリを起動中..."
cd android
chmod +x ./gradlew
./gradlew installDebug

echo "✅ インストール完了！デバイスでアプリを開いてください"