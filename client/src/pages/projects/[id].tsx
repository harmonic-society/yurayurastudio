import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
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
import { AlertCircle, Edit2 } from "lucide-react";

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update project: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load project details</p>
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
            Created for {project.clientName}
          </p>
        </div>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge>{project.status.replace("_", " ")}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p>{format(new Date(project.dueDate), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client Contact</p>
              <p>{project.clientContact}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reward</p>
              <p>${project.totalReward.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reward Distribution</p>
              <p className="whitespace-pre-line">{project.rewardRules}</p>
              <Badge 
                variant={project.rewardDistributed ? "success" : "secondary"}
                className="mt-2"
              >
                {project.rewardDistributed ? "Distributed" : "Pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{project.history}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <CommentSection projectId={projectId} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            onSubmit={(data) => updateMutation.mutate(data)}
            defaultValues={project}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
