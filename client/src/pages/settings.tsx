import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePassword, updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Camera } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileForm = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      title: user?.title || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || "",
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfile) => {
      console.log('プロフィール更新リクエスト:', data);
      return apiRequest("PATCH", "/api/users/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "成功",
        description: "プロフィールを更新しました",
      });
    },
    onError: (error) => {
      console.error('プロフィール更新エラー:', error);
      toast({
        title: "エラー",
        description: `プロフィールの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (data: UpdateProfile) => {
    console.log('フォーム送信データ:', data);
    updateProfileMutation.mutate(data);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ファイルサイズが大きすぎます",
        description: "5MB以下の画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "アップロードに失敗しました");
      }

      const { url } = await response.json();
      setAvatarPreview(url);
      profileForm.setValue("avatarUrl", url);
    } catch (error) {
      toast({
        title: "画像のアップロードに失敗しました",
        description: error instanceof Error ? error.message : "不明なエラーが発生しました",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          アプリケーションの設定を管理します
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール設定</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={avatarPreview || user?.avatarUrl || undefined}
                    alt={user?.name}
                  />
                  <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2">
                      <Camera className="h-4 w-4" />
                      <span>画像を変更</span>
                    </div>
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    推奨: 500x500px以上、5MB以下
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">肩書き</Label>
                  <Input
                    id="title"
                    {...profileForm.register("title")}
                  />
                  {profileForm.formState.errors.title && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">プロフィール文</Label>
                  <Textarea
                    id="bio"
                    {...profileForm.register("bio")}
                    placeholder="自己紹介や得意分野などを入力してください"
                  />
                  {profileForm.formState.errors.bio && (
                    <p className="text-sm text-destructive">{profileForm.formState.errors.bio.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending
                  ? "更新中..."
                  : "プロフィールを更新"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>パスワード変更</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit((data) =>
                  changePasswordMutation.mutate(data)
                )}
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