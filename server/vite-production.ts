import express, { type Express } from "express";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(_app: Express, _server: any) {
  // Vite is not used in production
  log("Running in production mode - Vite middleware skipped");
}

export function serveStatic(app: Express) {
  const publicPath = path.resolve(__dirname, "..", "dist", "public");
  
  log(`Serving static files from ${publicPath}`);
  
  app.use(express.static(publicPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}