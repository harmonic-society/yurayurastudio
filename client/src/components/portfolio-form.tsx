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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      url: defaultValues?.url || "",
      title: defaultValues?.title || "",
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
      await onSubmit(data);
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
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当者</FormLabel>
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
              <FormLabel>タイトル</FormLabel>
              <FormControl>
                <Input {...field} placeholder="成果物のタイトルを入力" />
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
              <FormLabel>成果物のURL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="成果物へのリンクを入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "保存中..." : "成果物を保存"}
        </Button>
      </form>
    </Form>
  );
}