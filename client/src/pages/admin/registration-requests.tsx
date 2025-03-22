import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type RegistrationRequest, userRoles } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";

const roleLabels = {
  ADMIN: "管理者",
  DIRECTOR: "ディレクター",
  SALES: "営業担当",
  CREATOR: "クリエイター"
} as const;

export default function RegistrationRequests() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<{
    request: RegistrationRequest;
    action: "approve" | "reject";
  } | null>(null);

  // 管理者でない場合はリダイレクト
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: requests, isLoading } = useQuery<RegistrationRequest[]>({
    queryKey: ["/api/admin/registration-requests"],
  });

  const handleRequestAction = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "approve" | "reject" }) => {
      const response = await fetch(`/api/admin/registration-requests/${id}/${action}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("操作に失敗しました");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/registration-requests"] });
      toast({
        title: variables.action === "approve" ? "承認しました" : "拒否しました",
        description: variables.action === "approve"
          ? "ユーザーアカウントが作成されました"
          : "登録リクエストを拒否しました",
      });
      setSelectedRequest(null);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "操作に失敗しました",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">登録リクエスト管理</h1>
        <p className="text-muted-foreground">
          新規ユーザーの登録リクエストを承認または拒否できます。
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>ユーザー名</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>役割</TableHead>
            <TableHead>申請日時</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>アクション</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests?.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.name}</TableCell>
              <TableCell>{request.username}</TableCell>
              <TableCell>{request.email}</TableCell>
              <TableCell>{roleLabels[request.role]}</TableCell>
              <TableCell>
                {format(new Date(request.createdAt), "yyyy/MM/dd HH:mm")}
              </TableCell>
              <TableCell>
                {request.status === "PENDING" && "承認待ち"}
                {request.status === "APPROVED" && "承認済み"}
                {request.status === "REJECTED" && "拒否"}
              </TableCell>
              <TableCell>
                {request.status === "PENDING" && (
                  <div className="space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        setSelectedRequest({ request, action: "approve" })
                      }
                    >
                      承認
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setSelectedRequest({ request, action: "reject" })
                      }
                    >
                      拒否
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRequest?.action === "approve"
                ? "登録リクエストを承認"
                : "登録リクエストを拒否"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest?.action === "approve"
                ? `${selectedRequest?.request.name}のユーザーアカウントを作成します。`
                : `${selectedRequest?.request.name}の登録リクエストを拒否します。`}
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedRequest &&
                handleRequestAction.mutate({
                  id: selectedRequest.request.id,
                  action: selectedRequest.action,
                })
              }
            >
              {selectedRequest?.action === "approve" ? "承認" : "拒否"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
