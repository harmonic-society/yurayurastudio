# Node.js 20を使用
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール（devDependenciesも含める）
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# Renderの環境変数を受け取る
ARG VITE_GOOGLE_API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# 環境変数を設定（ビルド時に使用）
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# アプリケーションをビルド
RUN npm run build

# 本番用の依存関係のみ再インストール
RUN npm ci --only=production && npm cache clean --force

# 本番環境の環境変数を設定
ENV NODE_ENV=production

# ポート10000を公開（Renderのデフォルト）
EXPOSE 10000

# アプリケーションを起動
CMD ["node", "dist/index-prod.js"]