import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

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

interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  title: string | null;
}

const roleLabels = {
  DIRECTOR: "ディレクター",
  SALES: "営業担当",
  CREATOR: "クリエイター",
  ADMIN: "管理者"
} as const;

export default function UserProfile() {
  const params = useParams();
  const userId = Number(params.id);
  const { toast } = useToast();

  // ユーザー情報を取得
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      if (!userId || isNaN(userId)) return null;
      const response = await apiRequest("GET", `/api/users/${userId}`);
      return response;
    },
    enabled: !!userId && !isNaN(userId)
  });

  // ユーザーのスキルを取得
  const { data: userSkills, isLoading: isLoadingSkills } = useQuery({
    queryKey: ['/api/users', userId, 'skills'],
    queryFn: async () => {
      if (!userId || isNaN(userId)) return null;
      const response = await apiRequest('GET', `/api/users/${userId}/skills`);
      return response;
    },
    enabled: !!userId && !isNaN(userId)
  });

  // ユーザーまたはスキルの読み込み中
  if (isLoadingUser || isLoadingSkills) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>ユーザー情報を読み込み中...</p>
      </div>
    );
  }

  // ユーザーが見つからない場合
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] space-y-4">
        <p className="text-xl">ユーザーが見つかりません</p>
        <Link href="/team">
          <Button variant="outline">チームメンバー一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  // カテゴリでスキルをグループ化
  const skillsByCategory: Record<string, SkillTag[]> = {};
  
  if (userSkills?.skills && userSkills.skills.length > 0) {
    userSkills.skills.forEach((skill: any) => {
      if (skill.category && skill.tag) {
        const categoryName = skill.category.name;
        if (!skillsByCategory[categoryName]) {
          skillsByCategory[categoryName] = [];
        }
        skillsByCategory[categoryName].push(skill.tag);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/team">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">プロフィール</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 左サイドバー：基本情報 */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {roleLabels[user.role as keyof typeof roleLabels]}
              </p>
              {user.title && <p className="text-sm">{user.title}</p>}
              <p className="text-sm mt-2">{user.email}</p>
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ：スキルと自己紹介 */}
        <div className="space-y-6 md:col-span-2">
          {/* 自己紹介 */}
          {user.bio && (
            <Card>
              <CardHeader>
                <CardTitle>自己紹介</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{user.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* スキル */}
          <Card>
            <CardHeader>
              <CardTitle>スキル</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(skillsByCategory).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(skillsByCategory).map(([category, tags]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="text-md font-medium">{category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <Badge key={tag.id} variant="outline">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">登録されたスキルはありません</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}