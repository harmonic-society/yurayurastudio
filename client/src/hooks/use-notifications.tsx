import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface Notification {
  id: number;
  userId: number;
  event: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// APIレスポンスの型定義
interface NotificationsResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 通知一覧を取得
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    retry: false,
    refetchInterval: 30000, // 30秒ごとに自動更新
  });

  const notifications = notificationsData || [];

  // 未読通知数を取得
  const {
    data: unreadCountData,
    isLoading: isLoadingUnreadCount,
  } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/notifications/unread-count"],
    retry: false,
    refetchInterval: 15000, // 15秒ごとに自動更新
  });
  
  const unreadCount = unreadCountData?.count || 0;

  // 通知を既読にする
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error) => {
      console.error("通知を既読にできませんでした", error);
      toast({
        title: "エラー",
        description: "通知を既読にできませんでした",
        variant: "destructive",
      });
    },
  });

  // すべての通知を既読にする
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/notifications/mark-all-read`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "完了",
        description: "すべての通知を既読にしました",
      });
    },
    onError: (error) => {
      console.error("通知を既読にできませんでした", error);
      toast({
        title: "エラー",
        description: "通知を既読にできませんでした",
        variant: "destructive",
      });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingUnreadCount,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
  };
}