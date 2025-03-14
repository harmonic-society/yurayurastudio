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
import { Textarea } from "@/components/ui/textarea";
import { insertProjectSchema, projectStatus, type User } from "@shared/schema";
import { format } from "date-fns";

const statusLabels = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留"
} as const;

interface ProjectFormProps {
  onSubmit: (data: any) => void;
  defaultValues?: any;
  isSubmitting?: boolean;
}

export default function ProjectForm({ 
  onSubmit, 
  defaultValues,
  isSubmitting 
}: ProjectFormProps) {
  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: defaultValues || {
      name: "",
      status: "NOT_STARTED",
      dueDate: format(new Date(), "yyyy-MM-dd"),
      clientName: "",
      clientContact: "",
      history: "",
      totalReward: 0,
      rewardRules: "",
      assignedUsers: []
    }
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>プロジェクト名</FormLabel>
              <FormControl>
                <Input {...field} placeholder="プロジェクト名を入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>状態</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="状態を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projectStatus.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
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
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>納期</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>顧客名</FormLabel>
              <FormControl>
                <Input {...field} placeholder="顧客名を入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>顧客連絡先</FormLabel>
              <FormControl>
                <Input {...field} placeholder="顧客の連絡先を入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalReward"
          render={({ field }) => (
            <FormItem>
              <FormLabel>報酬総額</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  placeholder="報酬総額を入力"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rewardRules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>報酬分配ルール</FormLabel>
              <FormControl>
                <Textarea 
                  {...field}
                  placeholder="例: ディレクター: 30%、営業: 20%、クリエイター: 50%"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="history"
          render={({ field }) => (
            <FormItem>
              <FormLabel>プロジェクト履歴</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="プロジェクトの経緯や重要な出来事を記録" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "プロジェクトを保存"}
        </Button>
      </form>
    </Form>
  );
}