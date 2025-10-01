import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type Lead, type User, type LeadComment } from "@shared/schema";
import LeadForm from "@/components/lead-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { AlertCircle, Edit2, Trash2, MessageSquare } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statusLabels = {
  NEW: "新規",
  CONTACTED: "連絡済み",
  NEGOTIATING: "交渉中",
  QUALIFIED: "有望",
  CONVERTED: "成約",
  LOST: "失注"
} as const;

const statusVariants = {
  NEW: "bg-blue-200 text-blue-700 border-blue-300",
  CONTACTED: "bg-yellow-200 text-yellow-700 border-yellow-300",
  NEGOTIATING: "bg-purple-200 text-purple-700 border-purple-300",
  QUALIFIED: "bg-green-200 text-green-700 border-green-300",
  CONVERTED: "bg-emerald-200 text-emerald-700 border-emerald-300",
  LOST: "bg-gray-200 text-gray-700 border-gray-300"
} as const;

export default function LeadDetails() {
  const [, params] = useRoute("/leads/:id");
  const leadId = Number(params?.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: [`/api/leads/${leadId}`],
  });

  const { data: comments } = useQuery<LeadComment[]>({
    queryKey: [`/api/leads/${leadId}/comments`],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}`] });
      setIsEditDialogOpen(false);
      toast({
        title: "成功",
        description: "リード案件が更新されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `リード案件の更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/leads/${leadId}`, { method: "DELETE" }),
    onSuccess: () => {
      setLocation("/leads");
      toast({
        title: "成功",
        description: "リード案件が削除されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `リード案件の削除に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/api/leads/${leadId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leads/${leadId}/comments`] });
      setCommentContent("");
      toast({
        title: "成功",
        description: "コメントが追加されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `コメントの追加に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getUserName = (userId: number | null | undefined) => {
    if (!userId) return "未設定";
    return users?.find((user) => user.id === userId)?.name || "不明なユーザー";
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>リード案件の読み込みに失敗しました</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lead.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            企業: {lead.companyName}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            編集
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>案件詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">ステータス</p>
              <Badge className={statusVariants[lead.status]}>
                {statusLabels[lead.status]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">説明</p>
              <p className="whitespace-pre-line">{lead.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">担当者</p>
              <p>{getUserName(lead.assignedToId)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">予算見込み</p>
              <p>{lead.estimatedBudget ? `¥${lead.estimatedBudget.toLocaleString()}` : "未定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">開始予定日</p>
              <p>{lead.estimatedStartDate ? format(new Date(lead.estimatedStartDate), "yyyy年M月d日") : "未定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">獲得元</p>
              <p>{lead.source || "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">登録日</p>
              <p>{format(new Date(lead.createdAt), "yyyy年M月d日")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>連絡先情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">担当者名</p>
              <p>{lead.contactName || "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p className="break-all">{lead.contactEmail || "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">電話番号</p>
              <p>{lead.contactPhone || "未設定"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              コメント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getUserName(comment.userId).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{getUserName(comment.userId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "yyyy年M月d日 HH:mm")}
                        </p>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-line">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  まだコメントがありません
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="コメントを入力..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => createCommentMutation.mutate(commentContent)}
                  disabled={!commentContent.trim() || createCommentMutation.isPending}
                >
                  {createCommentMutation.isPending ? "送信中..." : "コメントを追加"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>リード案件を編集</DialogTitle>
            <DialogDescription>
              リード案件の詳細情報を更新します。
            </DialogDescription>
          </DialogHeader>
          <LeadForm
            onSubmit={(data) => updateMutation.mutate(data)}
            defaultValues={lead}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>リード案件の削除</AlertDialogTitle>
            <AlertDialogDescription>
              {lead.title}を削除してもよろしいですか？
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-2 sm:mt-0">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
