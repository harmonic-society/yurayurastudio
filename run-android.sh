#!/bin/bash

# エラー時に終了するように設定
set -e

echo "🚀 Androidアプリを起動します..."

# 現在のディレクトリがプロジェクトのルートか確認
if [ ! -f "capacitor.config.ts" ]; then
  echo "❌ エラー: プロジェクトのルートディレクトリから実行してください。"
  exit 1
fi

# Android Studioがインストールされているか確認
if ! [ -x "$(command -v studio)" ] && ! [ -x "$(command -v /opt/android-studio/bin/studio.sh)" ] && ! [ -x "$(command -v open)" ]; then
  echo "⚠️ 警告: Android Studioが見つかりません。手動でAndroid Studioを開いてプロジェクトを実行してください。"
  echo "   Android Studioでプロジェクトを開く場合は、以下のディレクトリを選択してください:"
  echo "   $(pwd)/android"
  
  # 続行するか確認
  read -p "続行しますか？(y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 開発用サーバーが実行中か確認
SERVER_RUNNING=false
pgrep -f "npm run dev" > /dev/null && SERVER_RUNNING=true

if [ "$SERVER_RUNNING" = false ]; then
  echo "ℹ️ 開発サーバーが実行されていません。バックグラウンドで開始します..."
  npm run dev &
  # サーバーが起動するまで少し待つ
  sleep 5
  echo "✅ 開発サーバーを開始しました。"
fi

# capacitor.config.tsの設定を確認
echo "📋 Capacitorの設定を確認しています..."
HOSTNAME=$(grep -oP "hostname: ['\"]([^'\"]+)['\"]" capacitor.config.ts | head -1 | cut -d"'" -f2 | cut -d'"' -f2)

if [ -z "$HOSTNAME" ]; then
  echo "⚠️ 警告: capacitor.config.tsでホスト名が設定されていません。"
  echo "   デフォルトのlocalhostを使用します。"
elif [[ "$HOSTNAME" != "localhost"* && "$HOSTNAME" != "10.0.2.2"* ]]; then
  echo "⚠️ 警告: 開発中は通常、ホスト名をlocalhostまたは10.0.2.2（Android Emulator用）に設定します。"
  echo "   現在の設定: $HOSTNAME"
  
  # 設定を変更するか確認
  read -p "開発用の設定に変更しますか？(y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 設定を一時的に保存
    cp capacitor.config.ts capacitor.config.ts.bak
    
    # 設定を更新
    sed -i.tmp "s/hostname: ['\"]${HOSTNAME}['\"]/hostname: 'localhost:5000'/" capacitor.config.ts
    rm -f capacitor.config.ts.tmp
    
    echo "✅ capacitor.config.tsを開発用に更新しました。"
    echo "   変更内容: hostname = 'localhost:5000'"
    echo "   元の設定はcapacitor.config.ts.bakに保存されています。"
    
    # Capacitorの設定を同期
    echo "🔄 Capacitorの設定を同期しています..."
    npx cap sync android
  fi
fi

# アプリを実行
echo "📱 Androidアプリを起動しています..."
npx cap open android

# 成功メッセージ
echo ""
echo "✅ Android Studioが起動しました。"
echo "   Android Studioでアプリを実行するには、以下の手順に従ってください:"
echo "   1.「Run」ボタン（緑色の三角形）をクリックする"
echo "   2. デバイスを選択する（実機または仮想デバイス）"
echo ""
echo "🔍 アプリのデバッグには以下のツールが役立ちます:"
echo "   - Chrome DevTools: chrome://inspect/#devices"
echo "   - Android Logcat: Android Studioの「Logcat」タブ"
echo ""
echo "💡 ヒント: デバイスを接続する場合は、USBデバッグが有効になっていることを確認してください。"
echo "   設定 > 開発者向けオプション > USBデバッグ"