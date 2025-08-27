#!/bin/bash

# Renderのビルドスクリプト
# 環境変数をViteに渡すためのスクリプト

echo "Starting Render build script..."

# 環境変数のデバッグ出力
echo "Checking VITE environment variables:"
if [ -n "$VITE_GOOGLE_API_KEY" ]; then
  echo "  VITE_GOOGLE_API_KEY is set (first 10 chars): ${VITE_GOOGLE_API_KEY:0:10}..."
else
  echo "  VITE_GOOGLE_API_KEY is NOT set"
fi

if [ -n "$VITE_GOOGLE_CLIENT_ID" ]; then
  echo "  VITE_GOOGLE_CLIENT_ID is set (first 20 chars): ${VITE_GOOGLE_CLIENT_ID:0:20}..."
else
  echo "  VITE_GOOGLE_CLIENT_ID is NOT set"
fi

# .env.productionファイルを作成（Renderの環境変数から）
echo "Creating .env.production file..."
cat > client/.env.production << EOF
VITE_GOOGLE_API_KEY=${VITE_GOOGLE_API_KEY}
VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
EOF

echo "Contents of client/.env.production:"
cat client/.env.production

# 依存関係のインストール
echo "Installing dependencies..."
npm install

# ビルド実行
echo "Running build..."
npm run build

echo "Build completed!"