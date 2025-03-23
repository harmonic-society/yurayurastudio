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
app.use(express.static(path.join(__dirname, "..", "public")));

// Facebookなどのクローラー向けのOGP確認用エンドポイント
app.get("/fb-ogp", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
        <meta name="description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？地域愛にあふれるクリエイターの方、ぜひ登録を。" />
        <meta name="keywords" content="Web制作, 集客支援, 千葉県, プロジェクト管理, クリエイター, 地域貢献" />
        <meta property="og:title" content="Yura Yura STUDIO - プロジェクト管理ツール" />
        <meta property="og:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？地域愛にあふれるクリエイターの方、ぜひ登録を。" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ja_JP" />
        <meta property="og:image" content="https://yurayurastudio.com/ogp.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://yurayurastudio.com" />
        
        <!-- Twitter Card tags -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Yura Yura STUDIO - プロジェクト管理ツール" />
        <meta name="twitter:description" content="千葉県で地域貢献できるWeb制作・集客支援！Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？" />
        <meta name="twitter:image" content="https://yurayurastudio.com/ogp.png" />
        
        <!-- LinkedIn Card tags -->
        <meta property="og:site_name" content="Yura Yura STUDIO" />
        <meta property="og:image:alt" content="Yura Yura STUDIO プロジェクト管理ツールの紹介画像" />
        <title>Yura Yura STUDIO - プロジェクト管理ツール</title>
      </head>
      <body>
        <h1>Yura Yura STUDIO - プロジェクト管理ツール</h1>
        <p>千葉県で地域貢献できるWeb制作・集客支援！</p>
        <p>Yura Yura STUDIOのプロジェクト管理ツール（ベータ版）で、地域の事業者をサポートしませんか？</p>
        <p>地域愛にあふれるクリエイターの方、ぜひ登録を。</p>
        <img src="/ogp.png" alt="Yura Yura STUDIO" width="1200" height="630" />
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