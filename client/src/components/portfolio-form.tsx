import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { insertPortfolioSchema, type User, type InsertPortfolio } from "@shared/schema";

interface PortfolioFormProps {
  projectId: number;
  onSubmit: (data: InsertPortfolio) => void;
  defaultValues?: Partial<InsertPortfolio>;
  isSubmitting?: boolean;
}

export default function PortfolioForm({
  projectId,
  onSubmit,
  defaultValues,
  isSubmitting
}: PortfolioFormProps) {
  const form = useForm<InsertPortfolio>({
    resolver: zodResolver(insertPortfolioSchema),
    defaultValues: {
      projectId,
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      url: defaultValues?.url || "",
      userId: defaultValues?.userId
    }
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const roleLabels = {
    DIRECTOR: "ディレクター",
    SALES: "営業担当",
    CREATOR: "クリエイター"
  } as const;

  if (!users) return null;

  const handleSubmit = async (data: InsertPortfolio) => {
    try {
      const submitData = {
        projectId,
        userId: Number(data.userId),
        title: data.title.trim(),
        description: data.description.trim(),
        url: data.url.trim()
      };
      console.log('Portfolio form - Submitting data:', submitData);
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
                <Input {...field} placeholder="成果物へのリンクを入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
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