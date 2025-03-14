import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { type Project, type User, type Portfolio } from "@shared/schema";
import ProjectForm from "@/components/project-form";
import CommentSection from "@/components/comment-section";
import PortfolioForm from "@/components/portfolio-form";
import PortfolioList from "@/components/portfolio-list";
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
import { AlertCircle, Edit2, ArrowRightLeft, Trash2, Plus } from "lucide-react";
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
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [isPortfolioDeleteDialogOpen, setIsPortfolioDeleteDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
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

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (userId: number | null | undefined) => {
    if (!userId) return "未設定";
    return users?.find((user) => user.id === userId)?.name || "不明なユーザー";
  };

  // ポートフォリオ関連のクエリとミューテーション
  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: [`/api/projects/${projectId}/portfolios`],
  });

  const createPortfolioMutation = useMutation({
    mutationFn: (data: any) => {
      const submitData = {
        projectId,
        userId: Number(data.userId),
        imageUrl: data.imageUrl
      };
      console.log('Portfolio mutation data:', submitData);
      return apiRequest("POST", `/api/projects/${projectId}/portfolios`, submitData);
    },
    onSuccess: () => {
      console.log('Portfolio creation succeeded');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/portfolios`] });
      setIsPortfolioDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが作成されました",
      });
    },
    onError: (error: any) => {
      console.error('Portfolio creation error:', error);
      toast({
        title: "エラー",
        description: `ポートフォリオの作成に失敗しました: ${error.message || '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/portfolios/${selectedPortfolio?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/portfolios`] });
      setIsPortfolioDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが更新されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `ポートフォリオの更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/portfolios/${selectedPortfolio?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/portfolios`] });
      setIsPortfolioDeleteDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが削除されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `ポートフォリオの削除に失敗しました: ${error.message}`,
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            顧客: {project.clientName}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            プロジェクトを編集
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
            <CardTitle>プロジェクト詳細</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">状態</p>
              <Badge>{statusLabels[project.status]}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">担当クリエイター</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {project.assignedUsers?.map((userId) => (
                  <Badge key={userId} variant="secondary">
                    {getUserName(userId)}
                  </Badge>
                ))}
                {(!project.assignedUsers || project.assignedUsers.length === 0) && (
                  <p>未設定</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">担当ディレクター</p>
              <p>{getUserName(project.directorId)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">担当営業</p>
              <p>{getUserName(project.salesId)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">納期</p>
              <p>{format(new Date(project.dueDate), "yyyy年M月d日")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">顧客連絡先</p>
              <p className="break-all">{project.clientContact}</p>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>成果物</CardTitle>
            <Button onClick={() => {
              setSelectedPortfolio(null);
              setIsPortfolioDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              成果物を追加
            </Button>
          </CardHeader>
          <CardContent>
            <PortfolioList
              projectId={projectId}
              portfolios={portfolios}
              onEdit={(portfolio) => {
                setSelectedPortfolio(portfolio);
                setIsPortfolioDialogOpen(true);
              }}
              onDelete={(portfolio) => {
                setSelectedPortfolio(portfolio);
                setIsPortfolioDeleteDialogOpen(true);
              }}
            />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle>プロジェクトを編集</DialogTitle>
            <DialogDescription>
              プロジェクトの詳細情報を更新します。
            </DialogDescription>
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

      <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPortfolio ? "成果物を編集" : "新規成果物の追加"}
            </DialogTitle>
            <DialogDescription>
              {selectedPortfolio
                ? "既存の成果物の情報を更新します。"
                : "プロジェクトに新しい成果物を追加します。"
              }
            </DialogDescription>
          </DialogHeader>
          <PortfolioForm
            onSubmit={(data) => {
              console.log('PortfolioForm submitted:', data);
              if (selectedPortfolio) {
                updatePortfolioMutation.mutate(data);
              } else {
                createPortfolioMutation.mutate(data);
              }
            }}
            defaultValues={selectedPortfolio || undefined}
            isSubmitting={
              createPortfolioMutation.isPending || updatePortfolioMutation.isPending
            }
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isPortfolioDeleteDialogOpen}
        onOpenChange={setIsPortfolioDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>成果物の削除</AlertDialogTitle>
            <AlertDialogDescription>
              この成果物を削除してもよろしいですか？
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-2 sm:mt-0">キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePortfolioMutation.mutate()}
              disabled={deletePortfolioMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePortfolioMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}