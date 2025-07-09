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

# アプリケーションをビルド
RUN npm run build

# 本番用の依存関係のみ再インストール
RUN npm ci --only=production && npm cache clean --force

# 本番環境の環境変数を設定
ENV NODE_ENV=production

# ポート5000を公開
EXPOSE 5000

# アプリケーションを起動
CMD ["node", "dist/index.js"]