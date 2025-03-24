#!/bin/bash

# Replitデプロイ前準備スクリプト

echo "=========================================="
echo "Replit Production Deployment Preparation"
echo "=========================================="

# 本番環境用の設定ファイルをコピー
echo "本番環境用の設定ファイルを適用します..."
cp .replit.production .replit

# package.jsonを確認
echo "package.jsonを確認しています..."
if grep -q "\"start\":" package.json; then
  echo "- start スクリプト: OK"
else
  echo "- start スクリプトが見つかりません。package.jsonを確認してください。"
  exit 1
fi

if grep -q "\"build\":" package.json; then
  echo "- build スクリプト: OK"
else
  echo "- build スクリプトが見つかりません。package.jsonを確認してください。"
  exit 1
fi

# 実行権限の確認と付与
echo "スクリプトの実行権限を確認しています..."
chmod +x production-start.sh
echo "- production-start.sh: 実行権限付与 OK"

# デプロイ準備完了メッセージ
echo "=========================================="
echo "デプロイ準備が完了しました。"
echo "Replitのデプロイボタンをクリックしてデプロイを開始してください。"
echo "=========================================="