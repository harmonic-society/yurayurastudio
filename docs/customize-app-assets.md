# アプリのアイコンとスプラッシュスクリーンのカスタマイズ方法

このガイドでは、Yura Yura STUDIOアプリのアイコンとスプラッシュスクリーンをカスタマイズする方法を説明します。

## アプリアイコンのカスタマイズ

### 必要なアイコンサイズ

Androidでは、さまざまな解像度のアイコンが必要です。以下のサイズで準備します：

- ldpi: 36x36 px
- mdpi: 48x48 px
- hdpi: 72x72 px
- xhdpi: 96x96 px
- xxhdpi: 144x144 px
- xxxhdpi: 192x192 px
- Google Play用: 512x512 px

### アイコン作成のガイドライン

1. 透明な背景（PNG形式が推奨）
2. 角丸四角形のアイコンが推奨（Android 8.0以降の適応アイコン対応）
3. 余白を確保する（アイコンの周囲に全体の約20%程度）

### Capacitorを使用したアイコン設定手順

1. `resources`フォルダを作成し、その中に`icon.png`（1024x1024px以上推奨）を配置します。

   ```bash
   mkdir -p resources
   # 作成したアイコンをresources/icon.pngとして配置
   ```

2. `@capacitor/assets`パッケージをインストールします：

   ```bash
   npm install --save-dev @capacitor/assets
   ```

3. package.jsonにスクリプトを追加します：

   ```json
   "scripts": {
     "resources": "capacitor-assets generate --iconBackgroundColor=#FFFFFF --splashBackgroundColor=#4F46E5"
   }
   ```

4. リソース生成スクリプトを実行します：

   ```bash
   npm run resources
   ```

5. 生成されたアイコンをCapacitorプロジェクトに同期します：

   ```bash
   npx cap sync android
   ```

## スプラッシュスクリーンのカスタマイズ

### スプラッシュスクリーン画像の準備

スプラッシュスクリーン用の画像を作成します：

1. 中央に配置するロゴまたは画像（PNG、透過背景、2048x2048px推奨）
2. 様々な画面サイズに対応できるよう、十分な余白を取る

### Capacitorスプラッシュスクリーン設定

1. `resources`フォルダに`splash.png`を配置します：

   ```bash
   # 作成したスプラッシュ画像をresources/splash.pngとして配置
   ```

2. 前述のリソース生成スクリプトを実行します：

   ```bash
   npm run resources
   ```

3. `capacitor.config.ts`でスプラッシュスクリーンの設定をカスタマイズします：

   ```typescript
   plugins: {
     SplashScreen: {
       launchShowDuration: 2000,         // 表示時間（ミリ秒）
       backgroundColor: "#4F46E5",       // 背景色
       showSpinner: true,                // スピナーを表示するか
       spinnerColor: "#FFFFFF",          // スピナーの色
       androidScaleType: "CENTER_CROP",  // Android用の画像スケーリング
       splashFullScreen: true,           // フルスクリーン表示
       splashImmersive: true,            // Android用の没入型表示
     }
   }
   ```

4. 設定をCapacitorプロジェクトに同期します：

   ```bash
   npx cap sync android
   ```

## 適応アイコン（Adaptive Icons）の設定

Android 8.0（API 26）以降では、適応アイコンがサポートされています。これを設定するには：

1. foreground層とbackground層の2つの画像を用意します：
   - foreground: ロゴ画像（透過PNG、108x108dpまたは432x432px）
   - background: 背景色または背景画像（108x108dpまたは432x432px）

2. これらのファイルを以下のディレクトリに配置します：
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_background.xml`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_foreground.xml`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`

3. ic_launcher.xmlの例：
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
       <background android:drawable="@mipmap/ic_launcher_background" />
       <foreground android:drawable="@mipmap/ic_launcher_foreground" />
   </adaptive-icon>
   ```

## Google Play用のグラフィックアセット

Google Playストアには以下のグラフィックアセットが必要です：

1. **ハイレゾアイコン**: 512x512px PNG形式
2. **フィーチャーグラフィック**: 1024x500px JPEGまたはPNG形式
3. **スクリーンショット**: 各デバイスタイプ（スマートフォン、7インチタブレット、10インチタブレット）に対応したもの
4. **アプリの紹介動画** (オプション): YouTubeのURLリンク

## トラブルシューティング

### 一般的な問題と解決策

1. **アイコンが反映されない場合**:
   - キャッシュをクリアして再ビルド: `npx cap clean android && npx cap sync android`
   - Android Studioでプロジェクトを開き、直接リソースを確認

2. **スプラッシュスクリーンが表示されない**:
   - `@capacitor/splash-screen` プラグインが正しくインストールされているか確認
   - スプラッシュスクリーン設定をアプリの初期化コードで有効化しているか確認

3. **画像が歪む**:
   - アスペクト比を維持して、様々な画面サイズに対応できるデザインにする
   - `androidScaleType` の設定を調整（"CENTER", "CENTER_CROP", "CENTER_INSIDE", "FIT_CENTER", "FIT_XY"など）