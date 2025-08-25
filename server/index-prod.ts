import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite-production.js";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ファイルアップロードミドルウェアの設定
app.use(fileUpload());

// 静的ファイルのサービング
app.use(express.static(path.join(__dirname, "..", "public"), {
  setHeaders: (res, filePath) => {
    // OGP画像へのアクセスを改善するためのヘッダー設定
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
      res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
    }
  }
}));

// Facebookなどのクローラー向けのOGP確認用エンドポイント
function createOgpResponse(req: Request, res: Response) {
  // ホスト名を動的に取得
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  
  res.send(`
      <!DOCTYPE html>
      <html prefix="og: https://ogp.me/ns# fb: https://ogp.me/ns/fb#">
      <head>
        <meta charset="UTF-8">
        <meta property="og:title" content="Yura Yura STUDIO - プロジェクト管理ツール">
        <meta property="og:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？地域愛にあふれるクリエイターの方、ぜひ登録を。">
        <meta property="og:type" content="website">
        <meta property="og:image" content="${baseUrl}/ogp-image">
        <meta property="og:image:secure_url" content="${baseUrl}/ogp-image">
        <meta property="og:image:type" content="image/png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:locale" content="ja_JP">
        <meta property="og:site_name" content="Yura Yura STUDIO">
        <meta property="og:image:alt" content="Yura Yura STUDIO プロジェクト管理ツールの紹介画像">
        
        <!-- Facebook固有のメタタグ -->
        <meta property="og:url" content="${baseUrl}">
        <link rel="canonical" href="${baseUrl}">
        
        <!-- Twitter Card tags -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Yura Yura STUDIO - プロジェクト管理ツール">
        <meta name="twitter:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？">
        <meta name="twitter:image" content="${baseUrl}/ogp-image">
        
        <title>Yura Yura STUDIO - プロジェクト管理ツール</title>
      </head>
      <body>
        <h1>Yura Yura STUDIO - プロジェクト管理ツール</h1>
        <p>千葉県で地域貢献できるWeb制作・集客支援！</p>
        <img src="${baseUrl}/ogp-image" alt="Yura Yura STUDIO プロジェクト管理ツール" width="1200" height="630">
        <script>
          setTimeout(() => {
            window.location.href = "/";
          }, 5000);
        </script>
      </body>
      </html>
    `);
}

// Facebook向けの複数のエンドポイントを設定（Facebookクローラー対応）
// Facebookは様々なパスでコンテンツを探索するため、複数のエントリーポイントを用意
app.get("/fb-ogp", createOgpResponse);
// テンプレート変数を処理する関数
function processTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return variables[key.trim()] || match;
  });
}

// 共通のベースURLを取得する関数
function getBaseUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

// HTML テンプレートファイルを読み込み、変数を置換して送信する関数
function serveTemplatedHtml(templatePath: string, req: Request, res: Response): void {
  try {
    const baseUrl = getBaseUrl(req);
    const template = fs.readFileSync(templatePath, 'utf8');
    const processedHtml = processTemplate(template, { base_url: baseUrl });
    
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
    res.setHeader('Content-Type', 'text/html');
    res.send(processedHtml);
  } catch (error) {
    console.error(`テンプレート処理エラー: ${error}`);
    res.status(500).send('Internal Server Error');
  }
}

// Facebook向けの特化したルート
function serveFacebookCard(req: Request, res: Response) {
  serveTemplatedHtml(path.join(__dirname, "..", "public", "facebook-ogp.html"), req, res);
}

app.get("/facebook", serveFacebookCard);
app.get("/share", serveFacebookCard);
app.get("/fb", serveFacebookCard);
app.get("/ogp", createOgpResponse);
app.get("/og", createOgpResponse);

// X (Twitter) 向けの特化したルート
function serveTwitterCard(req: Request, res: Response) {
  serveTemplatedHtml(path.join(__dirname, "..", "public", "twitter-card.html"), req, res);
}

app.get("/twitter", serveTwitterCard);
app.get("/x", serveTwitterCard);
app.get("/twitter-card", serveTwitterCard);

// LinkedIn 向けの特化したルート
function serveLinkedInCard(req: Request, res: Response) {
  serveTemplatedHtml(path.join(__dirname, "..", "public", "linkedin-card.html"), req, res);
}

app.get("/linkedin", serveLinkedInCard);
app.get("/linkedin-card", serveLinkedInCard);

// OGP画像への直接アクセスを提供 - 複数のパスに対応
function serveOgpImage(req: Request, res: Response) {
  // 複数の候補画像パスを定義（優先順位順）
  const candidateImagePaths = [
    path.join(__dirname, "..", "public", "yurayurastudio-ogp.png"),
    path.join(__dirname, "..", "public", "ogp.png"),
    path.join(__dirname, "..", "public", "ogp_original.png")
  ];
  
  // 最初に存在する画像を使用
  let ogpImagePath = null;
  for (const imagePath of candidateImagePaths) {
    if (fs.existsSync(imagePath)) {
      ogpImagePath = imagePath;
      break;
    }
  }
  
  // 画像が見つからない場合のエラーハンドリング
  if (!ogpImagePath) {
    console.error("Error: OGP画像ファイルが見つかりません");
    return res.status(404).send("OGP画像が見つかりません");
  }
  
  // 本番環境でも確実にキャッシュが機能するよう、強固なキャッシュ設定を追加
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable'); // クライアント24時間、CDN 1年
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.setHeader('Vary', 'Origin'); // 正しいCORSキャッシュ
  res.setHeader('X-Content-Type-Options', 'nosniff'); // セキュリティ強化
  
  // デバッグ情報をログに出力
  console.log(`OGP画像を提供: ${ogpImagePath}`);
  
  // 安全性のためtryブロックで囲む
  try {
    const stream = fs.createReadStream(ogpImagePath);
    stream.on('error', (error) => {
      console.error(`OGP画像の読み込みエラー: ${error.message}`);
      res.status(500).send('画像の読み込みに失敗しました');
    });
    stream.pipe(res);
  } catch (error) {
    console.error(`OGP画像処理エラー: ${error}`);
    res.status(500).send('サーバーエラーが発生しました');
  }
}

// 複数のルートで同じOGP画像を提供
app.get("/ogp-image", serveOgpImage);
app.get("/yurayurastudio-ogp.png", serveOgpImage);
app.get("/ogp.png", serveOgpImage);

// FacebookのOGPデバッガー用の特別なエンドポイント
app.get("/facebook-debug", (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.send(`
    <!DOCTYPE html>
    <html prefix="og: https://ogp.me/ns# fb: https://ogp.me/ns/fb#">
    <head>
      <meta charset="UTF-8">
      <meta property="og:title" content="Yura Yura STUDIO - プロジェクト管理ツール">
      <meta property="og:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？地域愛にあふれるクリエイターの方、ぜひ登録を。">
      <meta property="og:type" content="website">
      <meta property="og:image" content="${baseUrl}/ogp-image">
      <meta property="og:image:secure_url" content="${baseUrl}/ogp-image">
      <meta property="og:image:type" content="image/png">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:url" content="${baseUrl}">
      <meta property="og:locale" content="ja_JP">
      <meta property="og:site_name" content="Yura Yura STUDIO">
      <meta property="fb:app_id" content="YOUR_FB_APP_ID">
      <title>Yura Yura STUDIO - プロジェクト管理ツール</title>
    </head>
    <body>
      <h1>Yura Yura STUDIO</h1>
      <p>千葉県で地域貢献できるWeb制作・集客支援！</p>
      <img src="${baseUrl}/ogp-image" alt="Yura Yura STUDIO プロジェクト管理ツール" width="1200" height="630">
      <script>
        setTimeout(() => {
          window.location.href = "/";
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // サーバーポートと環境設定
  // 本番環境の設定を強化
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`実行環境: ${isProduction ? '本番環境' : '開発環境'} (NODE_ENV=${process.env.NODE_ENV})`);
  
  // 明示的に本番環境のデフォルトポートを設定
  let port = 5000; // 開発環境のデフォルト
  
  if (isProduction) {
    // 本番環境ではPORTが必須
    if (process.env.PORT) {
      port = parseInt(process.env.PORT, 10);
    } else {
      port = 8080; // Cloud Runのデフォルト
      console.log('警告: 本番環境でPORT環境変数が設定されていません。デフォルトの8080を使用します。');
    }
    console.log(`本番環境ポート: ${port}`);
  } else if (process.env.PORT) {
    // 開発環境でPORTが指定されている場合
    port = parseInt(process.env.PORT, 10);
    console.log(`開発環境カスタムポート: ${port}`);
  } else {
    console.log(`開発環境デフォルトポート: ${port}`);
  }
  
  // すべてのネットワークインターフェースでリッスン
  const host = "0.0.0.0";
  
  server.listen(port, host, () => {
    log(`サーバー起動: ${host}:${port} (${isProduction ? '本番環境' : '開発環境'})`);
  });
})();