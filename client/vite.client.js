// Viteクライアント設定
if (import.meta.hot) {
  // 頻繁なリロードを抑制するカスタム設定
  import.meta.hot.accept(() => {
    // モジュールの変更があった場合でも自動リロードを行わない
    // 明示的なアクション（例：ボタンクリック）後の更新のみ許可
    const shouldReload = false; // デフォルトでリロードを無効化
    
    if (shouldReload) {
      // 必要な場合のみリロードを許可
      import.meta.hot.invalidate();
    }
  });
}