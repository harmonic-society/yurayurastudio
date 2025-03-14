import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type Project } from "@shared/schema";
import ProjectForm from "@/components/project-form";
import CommentSection from "@/components/comment-section";
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
} from "@/components/ui/dialog";
import { useState } from "react";
import { AlertCircle, Edit2, ArrowRightLeft, Trash2 } from "lucide-react";
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

const statusLabels = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留"
} as const;

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setIsEditDialogOpen(false);
      toast({
        title: "成功",
        description: "プロジェクトが更新されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `プロジェクトの更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/projects/${projectId}`),
    onSuccess: () => {
      navigate("/projects");
      toast({
        title: "成功",
        description: "プロジェクトが削除されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `プロジェクトの削除に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>プロジェクトの読み込みに失敗しました</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">
            顧客: {project.clientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            プロジェクトを編集
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            削除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>プロジェクト詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">状態</p>
              <Badge>{statusLabels[project.status]}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">納期</p>
              <p>{format(new Date(project.dueDate), "yyyy年M月d日")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">顧客連絡先</p>
              <p>{project.clientContact}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">報酬総額</p>
              <p>¥{project.totalReward.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">報酬分配</p>
              <p className="whitespace-pre-line">{project.rewardRules}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={project.rewardDistributed ? "default" : "secondary"}>
                  {project.rewardDistributed ? "分配済み" : "未分配"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateMutation.mutate({
                      rewardDistributed: !project.rewardDistributed,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "更新中..." : "状態を切り替え"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プロジェクト履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{project.history}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>コメント</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection projectId={projectId} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>プロジェクトを編集</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={(data) => updateMutation.mutate(data)}
            defaultValues={project}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プロジェクトの削除</AlertDialogTitle>
            <AlertDialogDescription>
              {project.name}を削除してもよろしいですか？
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
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