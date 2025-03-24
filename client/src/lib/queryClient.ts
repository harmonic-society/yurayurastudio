import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrOptions: string | { url: string; method?: string; body?: string; headers?: Record<string, string> },
  options?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<any> {
  let url: string;
  let method = 'GET';
  let body: string | undefined;
  let headers: Record<string, string> = {};
  
  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
    if (options) {
      method = options.method || 'GET';
      body = options.body;
      headers = options.headers || {};
    }
  } else {
    url = urlOrOptions.url;
    method = urlOrOptions.method || 'GET';
    body = urlOrOptions.body;
    headers = urlOrOptions.headers || {};
  }
  
  // デフォルトでJSONヘッダーを設定
  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // For DELETE requests that return 204 No Content
  if (res.status === 204) {
    return null;
  }
  
  try {
    // エラー処理を追加
    const text = await res.text();
    // 空のレスポンスがJSONとして解析されないようにする
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON解析エラー:", error);
    throw new Error("レスポンスの解析に失敗しました");
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    try {
      const text = await res.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch (error) {
      console.error("JSON解析エラー:", error);
      throw new Error("レスポンスの解析に失敗しました");
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
