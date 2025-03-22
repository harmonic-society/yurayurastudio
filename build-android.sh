#!/bin/bash

# エラー時に終了するように設定
set -e

echo "🚀 Androidアプリのビルドを開始します..."

# Webアプリケーションをビルド
echo "📦 Webアプリのビルド中..."
npm run build

# Capacitor構成を同期
echo "🔄 Capacitorの設定を同期中..."
npx cap sync android

# Androidビルド
echo "🤖 Androidアプリをビルド中..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug

echo "✅ ビルド完了！APKファイルは android/app/build/outputs/apk/debug/app-debug.apk にあります"