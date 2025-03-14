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
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { insertProjectSchema, projectStatus, type User } from "@shared/schema";
import { format } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    defaultValues: {
      name: defaultValues?.name || "",
      status: defaultValues?.status || "NOT_STARTED",
      dueDate: defaultValues?.dueDate ? format(new Date(defaultValues.dueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      clientName: defaultValues?.clientName || "",
      clientContact: defaultValues?.clientContact || "",
      history: defaultValues?.history || "",
      totalReward: defaultValues?.totalReward || 0,
      rewardRules: defaultValues?.rewardRules || "",
      directorId: defaultValues?.directorId || undefined,
      salesId: defaultValues?.salesId || undefined,
      assignedUsers: defaultValues?.assignedUsers || []
    }
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const directorUsers = users?.filter(user => user.role === "DIRECTOR") || [];
  const salesUsers = users?.filter(user => user.role === "SALES") || [];
  const creatorUsers = users?.filter(user => user.role === "CREATOR") || [];

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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="状態を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper">
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
          name="directorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当ディレクター</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ディレクターを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper">
                  <SelectItem value="none">選択なし</SelectItem>
                  {directorUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
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
          name="salesId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当営業</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="営業担当を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper">
                  <SelectItem value="none">選択なし</SelectItem>
                  {salesUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
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
          name="assignedUsers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>担当クリエイター</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {field.value?.length > 0
                      ? `${field.value.length}名のクリエイターを選択中`
                      : "クリエイターを選択"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="クリエイターを検索..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>クリエイターが見つかりません</CommandEmpty>
                      {creatorUsers.map((user) => {
                        const isSelected = field.value?.includes(user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={user.id.toString()}
                            onSelect={() => {
                              const newValue = isSelected
                                ? field.value.filter((id: number) => id !== user.id)
                                : [...(field.value || []), user.id];
                              field.onChange(newValue);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.name}
                          </CommandItem>
                        );
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {field.value?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((userId: number) => {
                    const user = creatorUsers.find(u => u.id === userId);
                    return user ? (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {user.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
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

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "保存中..." : "プロジェクトを保存"}
        </Button>
      </form>
    </Form>
  );
}