import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { insertPortfolioSchema, type User, type InsertPortfolio } from "@shared/schema";
import { useState, useEffect } from "react";

interface PortfolioFormProps {
  onSubmit: (data: InsertPortfolio) => void;
  defaultValues?: Partial<InsertPortfolio>;
  isSubmitting?: boolean;
  currentUserId: number; // 現在のユーザーIDを追加
}

export default function PortfolioForm({
  onSubmit,
  defaultValues,
  isSubmitting,
  currentUserId
}: PortfolioFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(defaultValues?.url || "");
  const [previewImage, setPreviewImage] = useState<string>("");

  useEffect(() => {
    const fetchOgpImage = async () => {
      if (!previewUrl) {
        setPreviewImage("");
        return;
      }

      try {
        const response = await fetch(`/api/ogp?url=${encodeURIComponent(previewUrl)}`);
        if (!response.ok) {
          setPreviewImage("");
          return;
        }
        const data = await response.json();
        setPreviewImage(data.imageUrl);
      } catch (error) {
        console.error('Failed to fetch OGP image:', error);
        setPreviewImage("");
      }
    };

    fetchOgpImage();
  }, [previewUrl]);

  const form = useForm<InsertPortfolio>({
    resolver: zodResolver(insertPortfolioSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      url: defaultValues?.url || "",
      userId: defaultValues?.userId || currentUserId,
      workType: defaultValues?.workType,
      isPublic: defaultValues?.isPublic ?? true
    }
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const roleLabels = {
    ADMIN: "管理者",
    DIRECTOR: "ディレクター",
    SALES: "営業担当",
    CREATOR: "クリエイター"
  } as const;

  const workTypeLabels = {
    DESIGN: "デザイン",
    DEVELOPMENT: "開発",
    WRITING: "ライティング",
    VIDEO: "動画",
    PHOTO: "写真"
  } as const;

  if (!users) return null;

  const handleSubmit = async (data: InsertPortfolio) => {
    try {
      const submitData = {
        userId: Number(data.userId),
        title: data.title.trim(),
        description: data.description.trim(),
        url: data.url.trim(),
        workType: data.workType,
        isPublic: data.isPublic ?? true
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Portfolio form submission error:', error);
      form.setError('root', {
        type: 'manual',
        message: 'フォームの送信に失敗しました'
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当者<span className="text-destructive">*</span></FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="担当者を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}（{roleLabels[user.role]}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>作業種別<span className="text-destructive">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="作業種別を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(workTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル<span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="成果物のタイトルを入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明<span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="成果物の説明を入力"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>成果物のURL<span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="成果物へのリンクを入力"
                  onChange={(e) => {
                    field.onChange(e);
                    setPreviewUrl(e.target.value);
                  }}
                />
              </FormControl>
              {previewUrl && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">プレビュー:</p>
                  {previewImage ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                      <img
                        src={previewImage}
                        alt="プレビュー"
                        className="object-cover w-full h-full"
                        onError={() => setPreviewImage("")}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">画像を読み込み中...</p>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>公開設定</FormLabel>
                <FormDescription>
                  このポートフォリオを他のユーザーに公開しますか？
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "保存中..." : "成果物を保存"}
          </Button>
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">
              ※入力内容に誤りがあります。各項目のエラーメッセージを確認してください。
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}