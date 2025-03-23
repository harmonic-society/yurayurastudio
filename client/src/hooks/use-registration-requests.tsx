import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

// 登録リクエストの型定義
interface RegistrationRequest {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export function useRegistrationRequests() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data: registrationRequests, isLoading, error } = useQuery<RegistrationRequest[]>({
    queryKey: ["/api/admin/registration-requests"],
    enabled: !!user && isAdmin,
    // キャッシュ時間を短くして最新情報を取得しやすくする
    staleTime: 1000 * 60, // 1分
  });

  // ステータスが "PENDING" のリクエスト数を計算
  const pendingCount = registrationRequests?.filter(
    (request) => request.status === "PENDING"
  ).length || 0;

  return {
    registrationRequests,
    pendingCount,
    isLoading,
    error,
  };
}