import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { insertCommentSchema, type Comment, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface CommentSectionProps {
  projectId: number;
}

export default function CommentSection({ projectId }: CommentSectionProps) {
  const queryClient = useQueryClient();

  const { data: comments } = useQuery<Comment[]>({
    queryKey: [`/api/projects/${projectId}/comments`]
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const form = useForm({
    resolver: zodResolver(insertCommentSchema),
    defaultValues: {
      content: "",
      projectId,
      userId: 1 // デモ用にハードコード
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", `/api/projects/${projectId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
      form.reset();
    }
  });

  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || "不明なユーザー";
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea 
                    placeholder="コメントを追加..." 
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "投稿中..." : "コメントを投稿"}
          </Button>
        </form>
      </Form>

      <div className="space-y-4">
        {comments?.map((comment) => (
          <div 
            key={comment.id}
            className="bg-card p-4 rounded-lg space-y-2"
          >
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{getUserName(comment.userId)}</span>
              <span>
                {format(new Date(comment.createdAt), "yyyy年M月d日 H:mm")}
              </span>
            </div>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}