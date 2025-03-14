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
import { insertPortfolioSchema, type User } from "@shared/schema";

interface PortfolioFormProps {
  onSubmit: (data: any) => void;
  defaultValues?: any;
  isSubmitting?: boolean;
}

export default function PortfolioForm({
  onSubmit,
  defaultValues,
  isSubmitting
}: PortfolioFormProps) {
  const form = useForm({
    resolver: zodResolver(insertPortfolioSchema),
    defaultValues: {
      imageUrl: defaultValues?.imageUrl || "",
      userId: defaultValues?.userId?.toString() || "",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当者</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="担当者を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper">
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
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>成果物URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="成果物のURLを入力" />
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