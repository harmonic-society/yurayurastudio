import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { insertPortfolioSchema } from "@shared/schema";

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
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      imageUrl: defaultValues?.imageUrl || "",
      workType: defaultValues?.workType || "",
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
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
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>画像URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="画像のURLを入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>作業タイプ</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Webサイト、ロゴ、チラシなど" />
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
