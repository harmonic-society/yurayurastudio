import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// メインのReactアプリをレンダリング
createRoot(document.getElementById("root")!).render(<App />);

// スプラッシュスクリーンの制御は別の非同期処理として実行
// これにより、Reactのレンダリングサイクルに干渉しない
async function hideSplashScreen() {
  try {
    // Capacitorが利用可能な環境かチェック
    if (typeof window !== 'undefined' && 'Capacitor' in window) {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      // スプラッシュスクリーンを非表示
      await SplashScreen.hide();
    }
  } catch (error) {
    console.error('Failed to hide splash screen:', error);
  }
}

// DOMContentLoadedイベントでスプラッシュスクリーン制御を実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hideSplashScreen);
} else {
  hideSplashScreen();
}
