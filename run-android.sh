#!/bin/bash

# このスクリプトはAndroidアプリを実行するためのものです

echo "=== Webアプリをビルド中... ==="
npm run build

echo "=== Capacitorの同期中... ==="
npx cap sync android

echo "=== Androidデバイスで実行中... ==="
npx cap run android

echo "完了！アプリが起動しました。"