import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// 報酬分配スキーマ
const rewardDistributionSchema = z.object({
  salesPercentage: z.coerce
    .number()
    .min(0, "0%以上で入力してください")
    .max(90, "90%以下で入力してください"),
  directorPercentage: z.coerce
    .number()
    .min(0, "0%以上で入力してください")
    .max(90, "90%以下で入力してください"),
  creatorPercentage: z.coerce
    .number()
    .min(0, "0%以上で入力してください")
    .max(90, "90%以下で入力してください"),
}).superRefine((data, ctx) => {
  const total = 10 + data.salesPercentage + data.directorPercentage + data.creatorPercentage;
  
  if (total !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `合計が100%になるように設定してください（現在: ${total}%）`,
      path: ["creatorPercentage"] // エラーメッセージをクリエイター割合に表示
    });
  }
});

type RewardDistributionFormProps = {
  defaultValues?: {
    salesPercentage: number;
    directorPercentage: number;
    creatorPercentage: number;
  };
  onSubmit: (data: z.infer<typeof rewardDistributionSchema>) => void;
  isSubmitting?: boolean;
};

export default function RewardDistributionForm({
  defaultValues = {
    salesPercentage: 15,
    directorPercentage: 25,
    creatorPercentage: 50,
  },
  onSubmit,
  isSubmitting = false,
}: RewardDistributionFormProps) {
  const [total, setTotal] = useState<number>(100);

  const form = useForm<z.infer<typeof rewardDistributionSchema>>({
    resolver: zodResolver(rewardDistributionSchema),
    defaultValues,
  });

  // フォームの値が変更された時に合計を更新
  const salesPercentage = form.watch("salesPercentage");
  const directorPercentage = form.watch("directorPercentage");
  const creatorPercentage = form.watch("creatorPercentage");

  useEffect(() => {
    const operationPercentage = 10; // 運営費は固定10%
    const newTotal = operationPercentage + 
      Number(salesPercentage || 0) + 
      Number(directorPercentage || 0) + 
      Number(creatorPercentage || 0);
    
    setTotal(newTotal);
  }, [salesPercentage, directorPercentage, creatorPercentage]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Alert className="bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            運営費は固定で10%です。他の割合の合計が90%になるように設定してください。
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="salesPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>営業担当 (%)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" max="90" />
                </FormControl>
                <FormDescription>営業担当者への配分率</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="directorPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ディレクター担当 (%)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" max="90" />
                </FormControl>
                <FormDescription>ディレクター担当者への配分率</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="creatorPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>クリエイター担当 (%)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="0" max="90" />
                </FormControl>
                <FormDescription>クリエイター担当者への配分率</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">合計: </span>
            <span className={total === 100 ? "text-green-600" : "text-red-600"}>
              {total}%
            </span>
            <span className="ml-2 text-muted-foreground">
              (運営費10% + 営業{salesPercentage || 0}% + ディレクター{directorPercentage || 0}% + クリエイター{creatorPercentage || 0}%)
            </span>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || total !== 100}>
          {isSubmitting ? "更新中..." : "報酬分配を保存"}
        </Button>
      </form>
    </Form>
  );
}