import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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
// Facebook向けの特化したルート
function serveFacebookCard(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.sendFile(path.join(__dirname, "..", "public", "facebook-ogp.html"));
}

app.get("/facebook", serveFacebookCard);
app.get("/share", serveFacebookCard);
app.get("/fb", serveFacebookCard);
app.get("/ogp", createOgpResponse);
app.get("/og", createOgpResponse);

// X (Twitter) 向けの特化したルート
function serveTwitterCard(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.sendFile(path.join(__dirname, "..", "public", "twitter-card.html"));
}

app.get("/twitter", serveTwitterCard);
app.get("/x", serveTwitterCard);
app.get("/twitter-card", serveTwitterCard);

// LinkedIn 向けの特化したルート
function serveLinkedInCard(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間のキャッシュ
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.sendFile(path.join(__dirname, "..", "public", "linkedin-card.html"));
}

app.get("/linkedin", serveLinkedInCard);
app.get("/linkedin-card", serveLinkedInCard);

// OGP画像への直接アクセスを提供 - 複数のパスに対応
function serveOgpImage(req: Request, res: Response) {
  const ogpImagePath = path.join(__dirname, "..", "public", "yurayurastudio-ogp.png");
  
  // 本番環境でも確実にキャッシュが機能するよう、強固なキャッシュ設定を追加
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable'); // クライアント24時間、CDN 1年
  res.setHeader('Access-Control-Allow-Origin', '*'); // CORSを許可
  res.setHeader('Vary', 'Origin'); // 正しいCORSキャッシュ
  res.setHeader('X-Content-Type-Options', 'nosniff'); // セキュリティ強化
  
  fs.createReadStream(ogpImagePath).pipe(res);
}

app.get("/ogp-image", serveOgpImage);
app.get("/yurayurastudio-ogp.png", serveOgpImage);

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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();