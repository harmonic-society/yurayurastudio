# Android開発環境のセットアップガイド

このガイドでは、Yura Yura STUDIOアプリを開発・ビルドするための環境構築方法を説明します。

## 1. 前提条件

### 必要なツール

- **Node.js** (バージョン16以上)
- **npm** (Node.jsに付属)
- **Java Development Kit (JDK)** (バージョン11以上)
- **Android Studio** (最新版推奨)

## 2. Java Development Kit (JDK)のインストール

### macOS

#### Homebrewを使用する場合:

```bash
# Homebrewがインストールされていない場合
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# OpenJDKをインストール
brew install openjdk@17

# PATHを設定
echo 'export PATH="/usr/local/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
# または
echo 'export PATH="/usr/local/opt/openjdk@17/bin:$PATH"' >> ~/.bash_profile

# 設定を反映
source ~/.zshrc  # または source ~/.bash_profile
```

#### 手動インストール:

1. [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)または[AdoptOpenJDK](https://adoptopenjdk.net/)からJDKをダウンロード
2. インストーラを実行
3. インストール完了後、ターミナルで`java -version`を実行して確認

### Windows

1. [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)または[AdoptOpenJDK](https://adoptopenjdk.net/)からJDKをダウンロード
2. インストーラを実行し、指示に従って進める
3. インストール完了後、コマンドプロンプトで`java -version`を実行して確認
4. 環境変数を設定:
   - システムのプロパティ > 詳細設定 > 環境変数
   - システム環境変数に`JAVA_HOME`を追加し、JDKのインストールディレクトリを指定
   - `Path`変数に`%JAVA_HOME%\bin`を追加

### Linux (Ubuntu/Debian)

```bash
# リポジトリを更新
sudo apt update

# OpenJDK 17をインストール
sudo apt install openjdk-17-jdk

# JDKがインストールされたことを確認
java -version
```

## 3. Android Studioのインストール

### macOS

1. [Android Studio](https://developer.android.com/studio)からダウンロード
2. ダウンロードしたDMGファイルを開き、Android Studioアイコンを「アプリケーション」フォルダにドラッグ
3. Android Studioを起動し、セットアップウィザードに従って進める
4. 「Custom」セットアップを選択し、以下のコンポーネントをインストール:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Performance (Intel HAXM)

### Windows

1. [Android Studio](https://developer.android.com/studio)からダウンロード
2. インストーラを実行し、指示に従って進める
3. Android Studioを起動し、セットアップウィザードに従って進める
4. 「Custom」セットアップを選択し、以下のコンポーネントをインストール:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Performance (Intel HAXM)

### Linux (Ubuntu/Debian)

```bash
# 必要なパッケージをインストール
sudo apt install libc6:i386 libncurses5:i386 libstdc++6:i386 lib32z1 libbz2-1.0:i386

# ダウンロードしたzipファイルを展開
cd ~/Downloads
tar -xvf android-studio-*.tar.gz
sudo mv android-studio /opt/

# Android Studioを起動
/opt/android-studio/bin/studio.sh
```

## 4. 環境変数の設定

### macOS (zsh)

```bash
# ~/.zshrc または ~/.bash_profile に追加
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
```

### Windows

1. システムのプロパティ > 詳細設定 > 環境変数
2. 以下のシステム環境変数を追加:
   - ANDROID_SDK_ROOT: C:\Users\YourUsername\AppData\Local\Android\Sdk
   - Path: 既存のPathに以下を追加:
     - %ANDROID_SDK_ROOT%\platform-tools
     - %ANDROID_SDK_ROOT%\emulator

### Linux

```bash
# ~/.bashrc に追加
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
```

## 5. プロジェクト用のAndroid SDKのセットアップ

1. Android Studioを起動
2. More Actions > SDK Manager を選択
3. SDK Platforms タブで以下をインストール:
   - Android 13 (API Level 33)
   - Android 12 (API Level 31)
   - Android 11 (API Level 30)
4. SDK Tools タブで以下をインストール:
   - Android SDK Build-Tools
   - NDK
   - Android SDK Command-line Tools
   - Android Emulator
   - Android SDK Platform-Tools

## 6. Capacitor CLIのインストール

```bash
npm install -g @capacitor/cli
```

## 7. プロジェクトのビルドと実行

### 初回セットアップ

```bash
# プロジェクトのルートディレクトリに移動
cd path/to/your/project

# 依存関係をインストール
npm install

# Androidプラットフォームを追加（初回のみ）
npx cap add android

# ウェブアプリをビルド
npm run build

# Capacitorを同期
npx cap sync android
```

### 開発用の実行

プロジェクトに含まれているスクリプトを使用して開発を行います：

```bash
# 開発用のAndroidアプリを起動
./run-android.sh
```

### リリースビルドの作成

```bash
# リリース準備スクリプトを実行
./prepare-android-release.sh

# リリースビルドスクリプトを実行
./build-android-release.sh
```

## 8. トラブルシューティング

### Javaが見つからない場合

```
The operation couldn't be completed. Unable to locate a Java Runtime.
Please visit http://www.java.com for information on installing Java.
```

このエラーは、Javaがインストールされていないか、パスが正しく設定されていない場合に発生します。

**解決方法**:
1. JDKが正しくインストールされていることを確認: `java -version`
2. JAVA_HOME環境変数が正しく設定されていることを確認
3. PATHにJavaのbinディレクトリが含まれていることを確認

### Android SDKの場所が見つからない場合

```
Android SDK not found. Make sure ANDROID_SDK_ROOT is set properly.
```

**解決方法**:
1. Android SDKがインストールされていることを確認
2. ANDROID_SDK_ROOT環境変数が正しく設定されていることを確認
3. Android Studioを開き、SDK Managerでインストール済みのSDKを確認

### Gradleビルドエラー

```
Execution failed for task ':app:processDebugResources'.
```

**解決方法**:
1. android/gradleビルドキャッシュをクリア: `cd android && ./gradlew clean`
2. プロジェクトを再同期: `npx cap sync android`

### APK/AABファイルを生成できない

**解決方法**:
1. キーストアが正しく設定されていることを確認
2. `android/keystore.properties` ファイルが正しいパスとパスワードを持っていることを確認
3. Gradleログで詳細なエラーを確認: `cd android && ./gradlew bundleRelease --info`

## 9. 参考リンク

- [Android開発者向けドキュメント](https://developer.android.com/docs)
- [Capacitorドキュメント](https://capacitorjs.com/docs)
- [JDKダウンロード](https://www.oracle.com/java/technologies/downloads/)
- [Android Studio](https://developer.android.com/studio)