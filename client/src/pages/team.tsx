import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import UserForm from "@/components/user-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

// スキルデータの型定義
interface SkillTag {
  id: number;
  categoryId: number;
  name: string;
  displayOrder: number;
}

interface SkillCategory {
  id: number;
  name: string;
  displayOrder: number;
}

interface UserSkillsResponse {
  userId: number;
  skills: Array<{
    id: number;
    userId: number;
    skillTagId: number;
    tag?: SkillTag;
    category?: SkillCategory;
  }>;
  skillTagIds: number[];
}

// ユーザースキル表示コンポーネント
function UserSkills({ userId }: { userId: number }) {
  const { data: userSkills, isLoading } = useQuery({
    queryKey: ['/api/users', userId, 'skills'],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiRequest('GET', `/api/users/${userId}/skills`);
      return response;
    },
    enabled: !!userId
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">スキル読み込み中...</p>;
  }

  if (!userSkills || !userSkills.skills || userSkills.skills.length === 0) {
    return <p className="text-xs text-muted-foreground">登録されたスキルはありません</p>;
  }

  // カテゴリでスキルをグループ化
  const skillsByCategory: Record<string, SkillTag[]> = {};
  
  userSkills.skills.forEach((skill: any) => {
    if (skill.category && skill.tag) {
      const categoryName = skill.category.name;
      if (!skillsByCategory[categoryName]) {
        skillsByCategory[categoryName] = [];
      }
      skillsByCategory[categoryName].push(skill.tag);
    }
  });

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">スキル</div>
      {Object.entries(skillsByCategory).map(([category, tags]) => (
        <div key={category} className="space-y-1">
          <div className="text-xs">{category}</div>
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge key={tag.id} variant="outline" className="text-xs px-1.5 py-0">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const roleLabels = {
  DIRECTOR: "ディレクター",
  SALES: "営業担当",
  CREATOR: "クリエイター"
} as const;

export default function Team() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "成功",
        description: "ユーザーが作成されました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: `ユーザーの作成に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedUser?.id) return null;
      const response = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "成功",
        description: "ユーザー情報が更新されました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: `ユーザー情報の更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser?.id) return null;
      const response = await apiRequest("DELETE", `/api/users/${selectedUser.id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "成功",
        description: "ユーザーが削除されました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: `ユーザーの削除に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const ActionButton = ({ 
    onClick, 
    icon: Icon,
    label,
    variant = "ghost"
  }: { 
    onClick?: () => void,
    icon: typeof Plus | typeof Pencil | typeof Trash2,
    label: string,
    variant?: "ghost" | "default"
  }) => {
    const button = (
      <Button
        variant={variant}
        size={variant === "ghost" ? "icon" : "default"}
        onClick={onClick}
        disabled={!onClick}
        className={variant === "ghost" ? "h-8 w-8" : undefined}
      >
        <Icon className={variant === "ghost" ? "h-4 w-4" : "h-4 w-4 mr-2"} />
        {variant !== "ghost" && label}
      </Button>
    );

    if (!onClick) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{button}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>この操作は管理者のみが行えます</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">チームメンバー</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            プロジェクトに携わるメンバー一覧
          </p>
        </div>
        <ActionButton
          onClick={isAdmin ? () => setIsCreateDialogOpen(true) : undefined}
          icon={Plus}
          label="メンバーを追加"
          variant="default"
        />
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Link href={`/users/${user.id}`}>
                  <CardTitle className="text-lg truncate hover:text-primary hover:underline cursor-pointer">
                    {user.name}
                  </CardTitle>
                </Link>
                <p className="text-sm text-muted-foreground truncate">
                  {roleLabels[user.role as keyof typeof roleLabels]}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <ActionButton
                  onClick={isAdmin ? () => {
                    setSelectedUser(user);
                    setIsEditDialogOpen(true);
                  } : undefined}
                  icon={Pencil}
                  label="編集"
                />
                <ActionButton
                  onClick={isAdmin ? () => {
                    setSelectedUser(user);
                    setIsDeleteDialogOpen(true);
                  } : undefined}
                  icon={Trash2}
                  label="削除"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm truncate">
                <span className="text-muted-foreground">メール：</span>
                {user.email}
              </p>
              
              <UserSkills userId={user.id} />
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新規メンバーの追加</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={(data) => createMutation.mutate(data)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>メンバー情報の編集</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={(data) => updateMutation.mutate(data)}
                defaultValues={selectedUser || undefined}
                isSubmitting={updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>メンバーの削除</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedUser?.name}を削除してもよろしいですか？
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
        </>
      )}
    </div>
  );
}