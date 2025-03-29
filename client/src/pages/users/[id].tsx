import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, PencilLine, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  tags: SkillTag[];
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

interface UserSkillsData {
  userId: number;
  skills: any[];
  skillTagIds: number[];
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
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [selectedTab, setSelectedTab] = useState("profile");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 自分のプロフィールかどうかを判断
  const isOwnProfile = currentUser?.id === userId;

  // ユーザー情報を取得
  const { 
    data: user, 
    isLoading: isLoadingUser,
    refetch: refetchUser
  } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId && !isNaN(userId)
  });

  // ユーザーのスキルを取得
  const { 
    data: userSkills, 
    isLoading: isLoadingSkills,
    refetch: refetchSkills
  } = useQuery<UserSkillsData>({
    queryKey: [`/api/users/${userId}/skills`],
    enabled: !!userId && !isNaN(userId)
  });

  // スキルカテゴリを取得
  const { data: skillCategories, isLoading: isLoadingCategories } = useQuery<SkillCategory[]>({
    queryKey: ['/api/skills/categories'],
    enabled: isOwnProfile
  });

  // プロフィール情報の初期化
  useEffect(() => {
    if (user) {
      setBioValue(user.bio || "");
      setTitleValue(user.title || "");
    }
  }, [user]);

  // スキルデータが取得できたらselectedSkillsを更新
  useEffect(() => {
    if (userSkills && userSkills.skillTagIds) {
      setSelectedSkills(userSkills.skillTagIds);
    }
  }, [userSkills]);

  // プロフィール更新のミューテーション
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { bio: string | null, title: string | null }) => {
      if (!userId) return null;
      return await apiRequest({
        url: `/api/users/${userId}`,
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "プロフィールを更新しました",
      });
      setIsEditing(false);
      refetchUser();
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `プロフィールの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    }
  });

  // スキル更新のミューテーション
  const updateSkillsMutation = useMutation({
    mutationFn: async (skillTagIds: number[]) => {
      if (!userId) return null;
      return await apiRequest({
        url: `/api/users/${userId}/skills`,
        method: 'PUT',
        body: JSON.stringify({ 
          userId: Number(userId),
          skillTagIds 
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "スキルを更新しました",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/skills`] });
      refetchSkills();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: `スキルの更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    }
  });

  // スキル選択の処理
  const handleSkillToggle = (skillId: number) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };

  // スキル更新の処理
  const handleSaveSkills = () => {
    updateSkillsMutation.mutate(selectedSkills);
  };

  // プロフィール保存の処理
  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      bio: bioValue || null,
      title: titleValue || null
    });
  };

  // アバター画像更新の処理
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "5MB以下の画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      // FormDataを使用する場合は直接APIリクエストではなくfetchを使用
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "アップロードに失敗しました");
      }

      const { url } = await response.json();
      setAvatarPreview(url);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: "成功",
        description: "プロフィール画像を更新しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "不明なエラーが発生しました",
        variant: "destructive",
      });
    }
  };

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
              <div className="relative">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage 
                    src={avatarPreview || user.avatarUrl || undefined} 
                    alt={user.name} 
                  />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <Label 
                    htmlFor="avatar" 
                    className="absolute -bottom-2 -right-2 flex justify-center items-center w-10 h-10 rounded-full bg-primary text-primary-foreground cursor-pointer shadow-md"
                  >
                    <Camera className="h-5 w-5" />
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </Label>
                )}
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {roleLabels[user.role as keyof typeof roleLabels]}
              </p>
              {user.title && !isEditing && (
                <p className="text-sm font-medium">{user.title}</p>
              )}
              {isEditing && (
                <div className="w-full mt-2 mb-4">
                  <Label htmlFor="title" className="text-sm">役職・肩書き</Label>
                  <Input
                    id="title"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    placeholder="例: シニアデザイナー"
                    className="mt-1 text-center"
                  />
                </div>
              )}
              <p className="text-sm mt-2">{user.email}</p>
              
              {isOwnProfile && !isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilLine className="h-4 w-4 mr-2" />
                  プロフィールを編集
                </Button>
              )}
              {isOwnProfile && isEditing && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setBioValue(user.bio || "");
                      setTitleValue(user.title || "");
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ：タブで切り替え */}
        <div className="space-y-6 md:col-span-2">
          <Tabs defaultValue="profile" value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="profile">プロフィール</TabsTrigger>
              <TabsTrigger value="skills">スキル</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              {/* 自己紹介 */}
              <Card>
                <CardHeader>
                  <CardTitle>自己紹介</CardTitle>
                </CardHeader>
                <CardContent>
                  {!isEditing ? (
                    user.bio ? (
                      <p className="whitespace-pre-line">{user.bio}</p>
                    ) : (
                      <p className="text-muted-foreground">自己紹介は登録されていません</p>
                    )
                  ) : (
                    <Textarea
                      value={bioValue}
                      onChange={(e) => setBioValue(e.target.value)}
                      placeholder="自己紹介を入力してください"
                      className="min-h-[150px]"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skills" className="space-y-6">
              {/* スキル一覧 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>スキル</CardTitle>
                    <CardDescription>
                      {userSkills?.skillTagIds?.length 
                      ? `${userSkills.skillTagIds.length}個のスキルが登録されています` 
                      : '登録されたスキルはありません'}
                    </CardDescription>
                  </div>
                  {isOwnProfile && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">スキルを編集</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>スキルの編集</DialogTitle>
                          <DialogDescription>
                            あなたが持っているスキルを選択してください。チームメンバーとプロジェクトで共有されます。
                          </DialogDescription>
                        </DialogHeader>
                        
                        {isLoadingCategories ? (
                          <div className="flex justify-center py-4">
                            <p>スキル情報を読み込み中...</p>
                          </div>
                        ) : (
                          <>
                            {/* 選択済みスキル表示エリア */}
                            {selectedSkills.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-2">選択中のスキル:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedSkills.map(skillId => {
                                    // 全カテゴリから該当するスキルタグを探す
                                    const tag = skillCategories?.flatMap(cat => cat.tags).find(tag => tag.id === skillId);
                                    return tag ? (
                                      <Badge key={skillId} variant="outline" className="px-2 py-1">
                                        {tag.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}

                            {/* カテゴリとスキル選択エリア */}
                            <div className="border rounded-md">
                              <Accordion type="multiple" className="w-full">
                                {skillCategories?.map((category) => (
                                  <AccordionItem key={category.id} value={`category-${category.id}`}>
                                    <AccordionTrigger className="px-4">
                                      {category.name}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                        {category.tags.map((tag) => (
                                          <div key={tag.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                              id={`skill-${tag.id}`} 
                                              checked={selectedSkills.includes(tag.id)}
                                              onCheckedChange={() => handleSkillToggle(tag.id)}
                                            />
                                            <Label htmlFor={`skill-${tag.id}`} className="cursor-pointer">
                                              {tag.name}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                            
                            <div className="flex justify-end mt-6 space-x-2">
                              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                キャンセル
                              </Button>
                              <Button 
                                onClick={handleSaveSkills}
                                disabled={updateSkillsMutation.isPending}
                              >
                                {updateSkillsMutation.isPending ? "保存中..." : "スキルを保存"}
                              </Button>
                            </div>
                          </>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}