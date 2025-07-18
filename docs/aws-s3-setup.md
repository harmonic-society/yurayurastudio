# AWS S3セットアップガイド

## S3バケット情報
- **バケット名**: yurayurastudio
- **ARN**: arn:aws:s3:::yurayurastudio

## セットアップ手順

### 1. IAMユーザーの作成

1. AWS管理コンソールにログイン
2. IAM → ユーザー → ユーザーを作成
3. ユーザー名を入力（例：`yurayurastudio-app`）
4. 「プログラムによるアクセス」を選択
5. 次の権限ポリシーをアタッチ：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::yurayurastudio/*",
        "arn:aws:s3:::yurayurastudio"
      ]
    }
  ]
}
```

### 2. アクセスキーの取得

1. 作成したIAMユーザーの詳細ページへ
2. 「セキュリティ認証情報」タブ
3. 「アクセスキー」→「アクセスキーを作成」
4. アクセスキーIDとシークレットアクセスキーを安全に保存

### 3. S3バケットの設定

#### CORS設定
S3バケットのプロパティ → CORS設定に以下を追加：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### パブリックアクセスブロック設定
- ブロックパブリックアクセス設定で、必要に応じて調整
- 署名付きURLを使用するため、基本的にはすべてブロックでOK

### 4. Renderでの環境変数設定

Renderのダッシュボードで以下の環境変数を設定：

- `AWS_REGION`: `ap-northeast-1` （東京リージョンの場合）
- `AWS_ACCESS_KEY_ID`: IAMユーザーのアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: IAMユーザーのシークレットアクセスキー
- `AWS_S3_BUCKET`: `yurayurastudio`

### 5. 動作確認

デプロイ後、以下を確認：
1. アプリケーションのログで「S3 Storage initialized」が表示される
2. ファイルアップロード機能が正常に動作する
3. アップロードされたファイルがS3バケットの`uploads/`フォルダに保存される

## トラブルシューティング

### エラー: Access Denied
- IAMユーザーの権限を確認
- バケットポリシーを確認

### エラー: No Such Bucket
- バケット名が正しいか確認
- リージョンが正しいか確認

### エラー: Invalid Credentials
- アクセスキーとシークレットキーが正しいか確認
- IAMユーザーが有効か確認