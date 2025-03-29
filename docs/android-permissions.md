# Androidアプリのパーミッション

このドキュメントでは、Yura Yura STUDIOアプリが使用する権限（パーミッション）と、それぞれの目的について説明します。Google Playストアでの公開時に必要な情報です。

## 基本パーミッション

### インターネット接続（INTERNET）
- **権限名**: `android.permission.INTERNET`
- **目的**: サーバーとの通信、プロジェクト情報の同期、メッセージのやり取りなど
- **必須**: はい

### ネットワーク状態の確認（ACCESS_NETWORK_STATE）
- **権限名**: `android.permission.ACCESS_NETWORK_STATE`
- **目的**: インターネット接続状態を監視し、オフライン時の対応
- **必須**: はい

## オプションパーミッション（必要に応じて）

### 通知（POST_NOTIFICATIONS）
- **権限名**: `android.permission.POST_NOTIFICATIONS`
- **目的**: 新しいメッセージや通知の表示（Android 13以上で必要）
- **必須**: いいえ（ただし通知機能を使う場合は必要）

### カメラ（CAMERA）
- **権限名**: `android.permission.CAMERA`
- **目的**: プロジェクト関連の写真撮影、プロフィール画像の更新
- **必須**: いいえ（プロフィール画像更新やプロジェクト写真アップロード機能を使う場合のみ）

### ファイルアクセス（READ_EXTERNAL_STORAGE）
- **権限名**: `android.permission.READ_EXTERNAL_STORAGE`
- **目的**: デバイスから画像や文書ファイルの選択とアップロード
- **必須**: いいえ（ファイルアップロード機能を使う場合のみ）

## パーミッション設定ガイド

### AndroidManifest.xmlへの追加方法

必要なパーミッションは以下のようにAndroidManifest.xmlに追加します：

```xml
<!-- 基本パーミッション（必須） -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- オプションパーミッション（必要に応じて） -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

### ランタイムパーミッションの実装

Android 6.0（API 23）以降では、一部の権限（危険な権限）はランタイムで要求する必要があります。Capacitorにはパーミッション管理のためのプラグインが用意されています。

```typescript
import { Permissions } from '@capacitor/core';

// カメラ権限をリクエスト
async function requestCameraPermission() {
  const { camera } = await Permissions.query({ name: 'camera' });
  
  if (camera === 'prompt' || camera === 'denied') {
    await Permissions.request({ name: 'camera' });
  }
}

// ストレージ権限をリクエスト（Android 13未満）
async function requestStoragePermission() {
  const { storage } = await Permissions.query({ name: 'storage' });
  
  if (storage === 'prompt' || storage === 'denied') {
    await Permissions.request({ name: 'storage' });
  }
}

// 通知権限をリクエスト（Android 13以上）
async function requestNotificationPermission() {
  const { notifications } = await Permissions.query({ name: 'notifications' });
  
  if (notifications === 'prompt' || notifications === 'denied') {
    await Permissions.request({ name: 'notifications' });
  }
}
```

## Google Play用パーミッション説明文

Google Playストアで公開する際に、特定のパーミッションについて理由を説明する必要があります。以下は説明文の例です：

### カメラ
```
カメラ権限は、ユーザーがプロフィール画像を更新したり、プロジェクト関連の写真を撮影・アップロードする際に使用されます。この機能はオプションであり、許可しなくてもアプリの基本機能は使用できます。
```

### ストレージ
```
ストレージ権限は、デバイスから画像や文書ファイルを選択し、プロジェクトに添付する際に使用されます。この機能はオプションであり、許可しなくてもアプリの基本機能は使用できます。
```

### 通知
```
通知権限は、新しいメッセージ、プロジェクトの更新、リマインダーなどをお知らせするために使用されます。より効率的なプロジェクト管理のために許可することをお勧めしますが、必須ではありません。
```