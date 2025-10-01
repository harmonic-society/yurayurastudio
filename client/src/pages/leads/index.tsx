import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { type Lead } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Calendar, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import LeadForm from "@/components/lead-form";

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

export default function Leads() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"]
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/leads", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "成功",
        description: "リード案件が作成されました",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `リード案件の作成に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">リード案件</h1>
          <p className="text-muted-foreground">
            案件化前の潜在案件を管理
          </p>
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規リード
        </Button>
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="font-semibold text-primary">タイトル</TableHead>
              <TableHead className="font-semibold text-primary">ステータス</TableHead>
              <TableHead className="font-semibold text-primary">企業名</TableHead>
              <TableHead className="font-semibold text-primary">予算</TableHead>
              <TableHead className="font-semibold text-primary">登録日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads && leads.length > 0 ? (
              leads.map((lead, i) => (
                <TableRow
                  key={lead.id}
                  className={cn(
                    "transition-colors hover:bg-primary/5",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50"
                  )}
                >
                  <TableCell className="font-medium">
                    <Link href={`/leads/${lead.id}`} className="text-primary hover:underline hover:text-primary/80 transition-colors">
                      {lead.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "border",
                        statusVariants[lead.status],
                        "px-2.5 py-0.5 text-xs"
                      )}
                    >
                      {statusLabels[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.companyName}</TableCell>
                  <TableCell>
                    {lead.estimatedBudget ? `¥${lead.estimatedBudget.toLocaleString()}` : "未定"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(lead.createdAt), "yyyy年M月d日")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <p className="text-muted-foreground">リード案件がありません</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新規リード案件の登録</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSubmit={(data) => createMutation.mutate(data)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
