# Yura Yura STUDIO

千葉県で地域貢献できるWeb制作・集客支援のためのプロジェクト管理システム（ベータ版）。

## 特徴

- プロジェクト管理：進行状況の把握と共有
- チームコラボレーション：クリエイター、営業、ディレクター間のスムーズな連携
- ポートフォリオ管理：制作物の記録と共有
- モバイルアプリ対応：AndroidアプリとしてCapacitorで実装

## 技術スタック

- フロントエンド：React, TypeScript, Tailwind CSS
- バックエンド：Node.js, Express
- データベース：PostgreSQL, Drizzle ORM
- モバイル：Capacitor (Android)

## 開発者向け情報

### 環境構築

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# Androidアプリのビルド
./build-android.sh
```

### データベース

PostgreSQLを使用しています。スキーマの変更は以下のコマンドで反映できます：

```bash
npm run db:push
```