import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { type Project, type ProjectStatus } from "@shared/schema";
import ProjectList from "@/components/project-list";
import ProjectFilter from "@/components/project-filter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProjectForm from "@/components/project-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function Projects() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "成功",
        description: "プロジェクトが作成されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `プロジェクトの作成に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(search.toLowerCase()) ||
      project.clientName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === "ALL" || project.status === status;

    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">プロジェクト一覧</h1>
          <p className="text-muted-foreground">
            Web制作・集客支援プロジェクトの管理と進捗確認
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      <ProjectFilter
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      <ProjectList projects={filteredProjects} />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規プロジェクトの作成</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}