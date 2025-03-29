# 環境変数の管理ガイド

このドキュメントでは、Yura Yura STUDIOアプリのビルドと実行に必要な環境変数の設定方法について説明します。

## 環境変数の重要性

環境変数は、以下の理由から重要です：

1. **セキュリティ**: API キーやパスワードなどの機密情報をコードに直接記述せず、環境変数として管理します。
2. **環境分離**: 開発環境、テスト環境、本番環境で異なる設定を使用できます。
3. **設定の柔軟性**: コードを変更せずに、設定を変更できます。

## 必須環境変数

Yura Yura STUDIOアプリでは、以下の環境変数が必要です：

| 環境変数名 | 説明 | 必須 | 使用場所 |
|------------|------|------|----------|
| `DATABASE_URL` | PostgreSQLデータベースの接続文字列 | はい | サーバー、データベース接続用 |
| `SESSION_SECRET` | セッション暗号化用の秘密鍵 | はい | サーバー、ユーザーセッション用 |
| `VITE_API_BASE_URL` | APIのベースURL | いいえ | クライアント、API通信用 |
| `SMTP_HOST` | SMTPサーバーのホスト名 | いいえ | サーバー、メール送信用 |
| `SMTP_PORT` | SMTPサーバーのポート | いいえ | サーバー、メール送信用 |
| `SMTP_USER` | SMTPサーバーのユーザー名 | いいえ | サーバー、メール送信用 |
| `SMTP_PASS` | SMTPサーバーのパスワード | いいえ | サーバー、メール送信用 |
| `EMAIL_FROM` | 送信元メールアドレス | いいえ | サーバー、メール送信用 |

## 環境変数の設定方法

### 開発環境での設定

#### 1. `.env`ファイルの作成

プロジェクトのルートディレクトリに`.env`ファイルを作成し、環境変数を設定します。

```env
# データベース設定
DATABASE_URL=postgresql://user:password@localhost:5432/yurayurastudio

# セッション設定
SESSION_SECRET=your-secure-session-secret

# メール設定（省略可）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=noreply@yurayurastudio.com

# フロントエンド設定（省略可）
VITE_API_BASE_URL=/api
```

**注意**: `.env`ファイルはGitリポジトリにコミットしないでください。`.gitignore`ファイルに`.env`を追加してください。

#### 2. Replitの環境変数設定

Replitで開発している場合は、Replitのダッシュボードから環境変数を設定します：

1. プロジェクトの「Secrets」タブを開きます。
2. 各環境変数の名前と値を追加します。

### 本番環境での設定

#### 1. サーバー環境での設定

本番サーバーでは、システムの環境変数として設定します：

```bash
# Linuxの場合
export DATABASE_URL=postgresql://user:password@localhost:5432/yurayurastudio
export SESSION_SECRET=your-secure-session-secret
# ... 他の環境変数も同様に設定

# 設定を永続化するには、.bashrcや.bash_profileに追加
echo 'export DATABASE_URL=postgresql://user:password@localhost:5432/yurayurastudio' >> ~/.bashrc
```

#### 2. Androidビルド時の環境変数設定

Androidアプリをビルドする際に環境変数を設定する方法：

##### ビルド時の環境変数

ビルド時の環境変数は、Viteの設定を通じてクライアントコードに埋め込まれます。これらの変数は`VITE_`プレフィックスが必要です。

```bash
# 環境変数を設定してからビルドを実行
export VITE_API_BASE_URL=https://api.yurayurastudio.com
npm run build
```

##### ランタイム環境変数

Capacitorを使ったAndroidアプリでは、ランタイム環境変数を設定するためには、アプリ起動時に設定ファイルを読み込むように実装する必要があります。

例えば、`assets/config.json`ファイルを作成し、そこに設定を保存します：

```json
{
  "apiBaseUrl": "https://api.yurayurastudio.com",
  "version": "1.0.0"
}
```

そして、アプリ起動時にこのファイルを読み込みます：

```typescript
// フロントエンドで環境設定を読み込む例
async function loadConfig() {
  try {
    const response = await fetch('/assets/config.json');
    const config = await response.json();
    return config;
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました', error);
    return {
      apiBaseUrl: 'https://api.yurayurastudio.com', // デフォルト値
      version: '1.0.0'
    };
  }
}

// 設定を使用する
loadConfig().then(config => {
  console.log('API URL:', config.apiBaseUrl);
});
```

## 環境変数のセキュリティ

環境変数、特に機密情報を含むものは、以下のセキュリティガイドラインに従って管理してください：

1. **公開リポジトリにコミットしない**: `.env`ファイルや機密情報を含む設定ファイルはGitにコミットしないでください。
2. **強力なパスワードを使用**: ランダムで強力なパスワードを生成して使用してください。
3. **最小権限の原則**: 各サービスに必要最小限の権限のみを付与してください。
4. **定期的な更新**: API キーやパスワードを定期的に更新してください。
5. **環境の分離**: 開発環境と本番環境で異なる認証情報を使用してください。

## 環境変数のデバッグ

環境変数が正しく設定されているか確認するには：

```javascript
// サーバーサイド
console.log('Database URL:', process.env.DATABASE_URL);

// クライアントサイド（Vite）
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
```

**警告**: デバッグ目的以外では、環境変数の値をログに出力しないでください。特に本番環境では、機密情報がログに残らないように注意してください。