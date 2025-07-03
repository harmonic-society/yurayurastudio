# Node.js 20を使用
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 本番環境の環境変数を設定
ENV NODE_ENV=production

# ポート5000を公開
EXPOSE 5000

# アプリケーションを起動
CMD ["npm", "start"]