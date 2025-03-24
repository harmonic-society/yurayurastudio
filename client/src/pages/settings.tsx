import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  changePasswordSchema, 
  type ChangePassword,
  type NotificationSetting
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { Bell, BellOff, Mail, Loader2 } from "lucide-react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// 通知設定のコンポーネント
function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 通知設定を取得
  const { data: settings, isLoading } = useQuery<NotificationSetting>({
    queryKey: ['/api/notification-settings'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
  
  // 通知タイプのラベルマッピング
  const notificationTypes = {
    notifyProjectCreated: {
      label: "プロジェクト作成通知",
      description: "新しいプロジェクトが作成された時に通知を受け取ります"
    },
    notifyProjectUpdated: {
      label: "プロジェクト更新通知",
      description: "プロジェクトが更新された時に通知を受け取ります"
    },
    notifyProjectCommented: {
      label: "コメント通知",
      description: "プロジェクトに新しいコメントがあった時に通知を受け取ります"
    },
    notifyProjectCompleted: {
      label: "プロジェクト完了通知",
      description: "プロジェクトが完了した時に通知を受け取ります"
    },
    notifyRewardDistributed: {
      label: "報酬分配通知",
      description: "報酬が分配された時に通知を受け取ります"
    }
  };
  
  // 通知設定更新のミューテーション
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<NotificationSetting>) => {
      const response = await apiRequest('/api/notification-settings', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "設定を保存しました",
        description: "通知設定が更新されました",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `設定の保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });
  
  // 通知設定の切り替え処理
  const handleToggle = (key: keyof typeof notificationTypes, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value } as Partial<NotificationSetting>);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知設定
        </CardTitle>
        <CardDescription>
          メール通知の受信設定を管理します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(notificationTypes).map(([key, { label, description }]) => {
          const typedKey = key as keyof typeof notificationTypes;
          const enabled = settings ? (settings as any)[typedKey] : false;
          
          return (
            <div key={key} className="flex items-start justify-between space-y-0">
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => handleToggle(typedKey, checked)}
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// 通知履歴の型定義
interface NotificationHistoryItem {
  id: number;
  userId: number;
  event: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

// テスト通知コンポーネント
function TestNotification() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        url: '/api/test-notification',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: "PROJECT_CREATED",
          title: "テスト通知",
          message: "これはテスト通知です。通知設定が正しく機能していることを確認するために送信されました。",
          link: window.location.origin
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "テスト通知を送信しました",
        description: "メールボックスを確認してください",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-history'] });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `通知の送信に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });
  
  return (
    <div className="mt-4 flex justify-end">
      <Button 
        variant="outline" 
        size="sm"
        disabled={testNotificationMutation.isPending}
        onClick={() => testNotificationMutation.mutate()}
        className="flex items-center gap-2"
      >
        {testNotificationMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            送信中...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            テスト通知を送信
          </>
        )}
      </Button>
    </div>
  );
}

// 通知履歴コンポーネント
function NotificationHistory() {
  const { data: history, isLoading } = useQuery<NotificationHistoryItem[]>({
    queryKey: ['/api/notification-history'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知履歴
        </CardTitle>
        <CardDescription>
          過去に受け取った通知の履歴を確認します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="notifications">
            <AccordionTrigger className="px-0">
              通知履歴を表示
            </AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin h-4 w-4 text-primary" />
                </div>
              ) : history && history.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {history.map((notification) => (
                    <Card key={notification.id} className="p-3">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm text-muted-foreground">{notification.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                      {notification.link && (
                        <a 
                          href={notification.link} 
                          className="text-xs text-primary hover:underline mt-1 block"
                        >
                          詳細を見る
                        </a>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <BellOff className="h-4 w-4 mr-2" />
                  通知履歴がありません
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* テスト通知ボタン */}
        <TestNotification />
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const passwordForm = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePassword) => {
      if (!user?.id) return null;
      const response = await apiRequest(`/api/users/${user.id}/change-password`, {
        method: "POST",
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "パスワードを変更しました",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `パスワードの変更に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });

  const handlePasswordSubmit = (data: ChangePassword) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          アカウント設定を管理します
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* 通知設定セクション */}
        <NotificationSettings />
        
        {/* 通知履歴セクション */}
        <NotificationHistory />
        
        {/* パスワード変更セクション */}
        <Card>
          <CardHeader>
            <CardTitle>パスワード変更</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>現在のパスワード</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新しいパスワード</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新しいパスワード（確認）</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending
                    ? "変更中..."
                    : "パスワードを変更"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}