#!/bin/bash

# このスクリプトはAndroidアプリをビルドするためのものです

echo "=== Webアプリをビルド中... ==="
npm run build

echo "=== Capacitorの同期中... ==="
npx cap sync android

echo "=== Android Studioを開く... ==="
npx cap open android

echo "完了！Android Studioが開きました。ビルドして実機またはエミュレータで実行してください。"