#!/bin/bash

# エラー時に終了するように設定
set -e

echo "🚀 Androidアプリのリリースビルドを開始します..."

# 現在のディレクトリがプロジェクトのルートか確認
if [ ! -f "capacitor.config.ts" ]; then
  echo "❌ エラー: プロジェクトのルートディレクトリから実行してください。"
  exit 1
fi

# 現在の日時を取得
BUILD_DATE=$(date +"%Y%m%d_%H%M%S")
RELEASE_DIR="release_build_$BUILD_DATE"
mkdir -p "$RELEASE_DIR"

# キーストア情報を取得
KEYSTORE_PATH="android/app/keystore.jks"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "❌ エラー: キーストアファイルが見つかりません。"
  echo "   ./prepare-android-release.sh を先に実行してキーストアを作成してください。"
  exit 1
fi

# キーストア情報を求める
read -p "キーストアのパスワードを入力してください: " KEYSTORE_PASSWORD
read -p "キーのエイリアスを入力してください [upload]: " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-upload}
read -p "キーのパスワードを入力してください [キーストアと同じパスワード]: " KEY_PASSWORD
KEY_PASSWORD=${KEY_PASSWORD:-$KEYSTORE_PASSWORD}

# アプリバージョンを取得
VERSION=$(grep -oP 'versionName "\K[^"]+' android/app/build.gradle)
VERSION_CODE=$(grep -oP 'versionCode \K\d+' android/app/build.gradle)

echo "📱 ビルド情報:"
echo "   - バージョン: $VERSION (Build $VERSION_CODE)"
echo "   - ビルド日時: $(date "+%Y/%m/%d %H:%M:%S")"

# キーストア情報を一時ファイルに書き込む
KEYSTORE_PROPS="android/keystore.properties"
cat > "$KEYSTORE_PROPS" << EOL
storePassword=$KEYSTORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=app/keystore.jks
EOL

# キーストアプロパティファイルの権限を制限
chmod 600 "$KEYSTORE_PROPS"

# APKビルド
echo "🔨 リリース用APKをビルドしています..."
cd android
./gradlew assembleRelease

# バンドル（AAB）ビルド
echo "📦 リリース用アプリバンドル（AAB）をビルドしています..."
./gradlew bundleRelease

# ビルド成果物をコピー
cd ..
mkdir -p "$RELEASE_DIR/outputs"
cp android/app/build/outputs/apk/release/app-release.apk "$RELEASE_DIR/outputs/yurayurastudio-$VERSION-$BUILD_DATE.apk"
cp android/app/build/outputs/bundle/release/app-release.aab "$RELEASE_DIR/outputs/yurayurastudio-$VERSION-$BUILD_DATE.aab"

# キーストアプロパティファイルを削除
rm -f "$KEYSTORE_PROPS"

# リリース情報を作成
cat > "$RELEASE_DIR/release_info.txt" << EOL
Yura Yura STUDIO リリース情報
==========================
バージョン: $VERSION
ビルド番号: $VERSION_CODE
ビルド日時: $(date "+%Y/%m/%d %H:%M:%S")

ビルド成果物:
- APK: outputs/yurayurastudio-$VERSION-$BUILD_DATE.apk
- AAB: outputs/yurayurastudio-$VERSION-$BUILD_DATE.aab

キーストア情報:
- パス: $KEYSTORE_PATH
- エイリアス: $KEY_ALIAS
EOL

echo ""
echo "✅ ビルド完了！"
echo ""
echo "📄 ビルド成果物の場所:"
echo "   - APK: $RELEASE_DIR/outputs/yurayurastudio-$VERSION-$BUILD_DATE.apk"
echo "   - AAB: $RELEASE_DIR/outputs/yurayurastudio-$VERSION-$BUILD_DATE.aab"
echo "   - リリース情報: $RELEASE_DIR/release_info.txt"
echo ""
echo "🔍 Google Play Storeで公開するには、AABファイルをアップロードします。"
echo "   APKファイルは、テスト用やPlayストア以外での配布に使用できます。"
echo ""
echo "🔑 重要: キーストアファイル ($KEYSTORE_PATH) を安全にバックアップしてください。"
echo "   このキーを紛失すると、アプリの更新ができなくなります。"
echo ""
echo "🔙 設定を元に戻すには:"
echo "   $ node update-capacitor-config.js dev"
echo "   $ npx cap sync android"