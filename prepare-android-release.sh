#!/bin/bash

# エラー時に終了するように設定
set -e

echo "🚀 Androidアプリのリリース準備を開始します..."

# 現在の日時を取得
BUILD_DATE=$(date +"%Y%m%d")

# 作業ディレクトリを作成
RELEASE_DIR="release_build_$BUILD_DATE"
mkdir -p "$RELEASE_DIR"

# 設定ファイルのバックアップを作成
echo "📦 設定ファイルのバックアップを作成中..."
cp capacitor.config.ts "$RELEASE_DIR/capacitor.config.ts.bak"
cp android/app/build.gradle "$RELEASE_DIR/build.gradle.bak"

# 本番環境用の設定に更新
echo "⚙️ 本番環境用の設定に更新中..."
node update-capacitor-config.js prod

# キーストアの確認
KEYSTORE_PATH="android/app/keystore.jks"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "🔑 リリース用の署名キーを作成します..."
  
  # キーストア情報の入力を求める
  read -p "キーストアのパスワードを入力してください: " KEYSTORE_PASSWORD
  read -p "キーのエイリアスを入力してください [upload]: " KEY_ALIAS
  KEY_ALIAS=${KEY_ALIAS:-upload}
  read -p "キーのパスワードを入力してください [キーストアと同じパスワード]: " KEY_PASSWORD
  KEY_PASSWORD=${KEY_PASSWORD:-$KEYSTORE_PASSWORD}
  
  # キーストアを生成
  keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Harmonic Society, OU=Development, O=Harmonic Society Inc., L=Chiba, S=Chiba, C=JP"
  
  # 環境変数に設定
  export KEYSTORE_PASSWORD
  export KEY_ALIAS
  export KEY_PASSWORD
  
  # キーの情報を記録
  echo "キーストア情報を保存しています..."
  {
    echo "KEYSTORE_PATH=$KEYSTORE_PATH"
    echo "KEYSTORE_PASSWORD=$KEYSTORE_PASSWORD"
    echo "KEY_ALIAS=$KEY_ALIAS"
    echo "KEY_PASSWORD=$KEY_PASSWORD"
  } > "$RELEASE_DIR/keystore_info.txt"
  chmod 600 "$RELEASE_DIR/keystore_info.txt"
  
  echo "⚠️ キーストア情報は $RELEASE_DIR/keystore_info.txt に保存されました。"
  echo "⚠️ このファイルを安全な場所にバックアップしてください。キーストアを紛失すると、アプリの更新ができなくなります。"
fi

# Webアプリケーションをビルド
echo "🌐 Webアプリをプロダクションモードでビルド中..."
NODE_ENV=production npm run build

# Capacitor構成を同期
echo "🔄 Capacitorの設定を同期中..."
npx cap sync android

# リリースノートを作成
VERSION=$(grep -oP 'versionName "\K[^"]+' android/app/build.gradle)
VERSION_CODE=$(grep -oP 'versionCode \K\d+' android/app/build.gradle)

# リリースノートテンプレートを作成
cat > "$RELEASE_DIR/release_notes_v$VERSION.txt" << EOL
Yura Yura STUDIO v$VERSION (Build $VERSION_CODE)
リリース日: $(date +"%Y/%m/%d")

【新機能】
- 

【改善点】
- 

【バグ修正】
- 

【その他】
- 
EOL

echo "📝 リリースノートのテンプレートを $RELEASE_DIR/release_notes_v$VERSION.txt に作成しました。"
echo "   リリース内容を記入してください。"

# ビルド手順の説明
echo ""
echo "🔍 リリースビルドの準備が完了しました。"
echo ""
echo "📱 リリースビルドを実行するには、以下のコマンドを実行してください："
echo "   $ ./build-android-release.sh"
echo ""
echo "🔙 設定を元に戻すには、以下のコマンドを実行してください："
echo "   $ cp $RELEASE_DIR/capacitor.config.ts.bak capacitor.config.ts"
echo "   $ cp $RELEASE_DIR/build.gradle.bak android/app/build.gradle"
echo "   $ npx cap sync android"
echo ""
echo "✅ 完了！"