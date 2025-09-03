import { useQuery, useMutation } from "@tanstack/react-query";
import { type PortfolioWithProject, type User, type InsertPortfolio } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Loader2, ExternalLink, User as UserIcon, Calendar, Tag, Download, Plus, Pencil, Trash2, FolderOpen, ChevronLeft, ChevronRight, FileStack } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import PortfolioForm from "@/components/portfolio-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Portfolios() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: portfolios, isLoading: isLoadingPortfolios } = useQuery<PortfolioWithProject[]>({
    queryKey: ["/api/portfolios"]
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});
  const [currentFileIndex, setCurrentFileIndex] = useState<Record<number, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioWithProject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // デフォルトアイコンの定義
  const getDefaultIcon = (portfolio: PortfolioWithProject) => {
    if (portfolio.fileType) {
      if (portfolio.fileType === 'application/pdf') {
        return '/assets/icons/pdf-icon.svg';
      } else if (portfolio.fileType.includes('word') || portfolio.fileType.includes('document')) {
        return '/assets/icons/word-icon.svg';
      } else if (portfolio.fileType.includes('excel') || portfolio.fileType.includes('spreadsheet')) {
        return '/assets/icons/excel-icon.svg';
      } else if (portfolio.fileType.includes('powerpoint') || portfolio.fileType.includes('presentation')) {
        return '/assets/icons/powerpoint-icon.svg';
      }
    }
    // デフォルトのファイルアイコン
    return '/assets/icons/file-icon.svg';
  };

  useEffect(() => {
    const fetchOgpImages = async () => {
      if (!portfolios) return;

      const images: Record<number, string> = {};
      
      // 並列処理で全てのOGP画像を取得
      const promises = portfolios.map(async (portfolio) => {
        // 複数ファイルがある場合は最初のファイルの画像を使用
        if (portfolio.files && portfolio.files.length > 0) {
          const firstFile = portfolio.files[0];
          if (firstFile.fileType?.startsWith('image/')) {
            images[portfolio.id] = firstFile.filePath;
            return;
          } else {
            images[portfolio.id] = getDefaultIcon(portfolio);
            return;
          }
        }
        
        // 単一ファイルの場合の処理
        // イメージURL（ファイルアップロード時のプレビュー）が既にある場合
        if (portfolio.imageUrl) {
          images[portfolio.id] = portfolio.imageUrl;
          return;
        }
        
        // ファイルタイプが画像で、ファイルパスがある場合
        if (portfolio.fileType?.startsWith('image/') && portfolio.filePath) {
          images[portfolio.id] = portfolio.filePath;
          return;
        }
        
        // ファイルタイプがドキュメントの場合、アイコンを設定
        if (portfolio.filePath && portfolio.fileType && !portfolio.fileType.startsWith('image/')) {
          images[portfolio.id] = getDefaultIcon(portfolio);
          return;
        }
        
        // URL形式のポートフォリオのOGP画像を取得
        if (portfolio.url && portfolio.url.trim() !== '') {
          try {
            // タイムアウトを設定（3秒）
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`/api/ogp?url=${encodeURIComponent(portfolio.url)}`, {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data.imageUrl) {
                images[portfolio.id] = data.imageUrl;
              } else {
                // OGP画像が取得できない場合はデフォルトアイコン
                images[portfolio.id] = '/assets/icons/file-icon.svg';
              }
            } else {
              images[portfolio.id] = '/assets/icons/file-icon.svg';
            }
          } catch (error) {
            console.warn(`OGP画像の取得をスキップ (portfolio ${portfolio.id}):`, error);
            // エラーの場合もデフォルトアイコンを設定
            images[portfolio.id] = '/assets/icons/file-icon.svg';
          }
        }
      });
      
      // 全ての処理が完了するまで待つ
      await Promise.all(promises);
      setPreviewImages(images);
    };

    fetchOgpImages();
  }, [portfolios]);

  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || "不明なユーザー";
  };

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: async (data: InsertPortfolio) => {
      console.log('Creating portfolio with data:', data);
      const response = await apiRequest('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが作成されました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: `ポートフォリオの作成に失敗しました: ${error.message || '不明なエラー'}`,
        variant: "destructive",
      });
    },
  });

  // Update portfolio mutation
  const updatePortfolioMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/portfolios/${selectedPortfolio?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが更新されました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: `ポートフォリオの更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete portfolio mutation
  const deletePortfolioMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/portfolios/${selectedPortfolio?.id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setIsDeleteDialogOpen(false);
      setSelectedPortfolio(null);
      toast({
        title: "成功",
        description: "ポートフォリオが削除されました",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: `ポートフォリオの削除に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const workTypeLabels = {
    DESIGN: "デザイン",
    DEVELOPMENT: "開発",
    WRITING: "ライティング",
    VIDEO: "動画",
    PHOTO: "写真"
  } as const;

  const workTypeColors = {
    DESIGN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    DEVELOPMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    WRITING: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    VIDEO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    PHOTO: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
  } as const;

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">成果物ギャラリー</h1>
          <p className="text-muted-foreground">
            当チームが手がけたプロジェクトの実績一覧
          </p>
        </div>
        {user && (
          <Button 
            onClick={() => {
              setSelectedPortfolio(null);
              setIsDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新規追加
          </Button>
        )}
      </div>

      {isLoadingPortfolios ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary/70" />
            <p className="text-muted-foreground">成果物データを読み込み中...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {portfolios?.map((portfolio) => {
            const hasMultipleFiles = portfolio.files && portfolio.files.length > 0;
            const currentIndex = currentFileIndex[portfolio.id] || 0;
            const currentFile = hasMultipleFiles ? portfolio.files![currentIndex] : null;
            
            // ナビゲーション関数
            const handlePrevFile = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (hasMultipleFiles) {
                setCurrentFileIndex(prev => ({
                  ...prev,
                  [portfolio.id]: currentIndex > 0 ? currentIndex - 1 : portfolio.files!.length - 1
                }));
              }
            };
            
            const handleNextFile = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (hasMultipleFiles) {
                setCurrentFileIndex(prev => ({
                  ...prev,
                  [portfolio.id]: currentIndex < portfolio.files!.length - 1 ? currentIndex + 1 : 0
                }));
              }
            };
            
            return (
            <Card key={portfolio.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 group">
              <div className="relative h-40">
                {/* 複数ファイルインジケーター */}
                {hasMultipleFiles && portfolio.files!.length > 1 && (
                  <>
                    <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 z-10">
                      <FileStack className="h-3 w-3" />
                      <span>{currentIndex + 1} / {portfolio.files!.length}</span>
                    </div>
                    
                    {/* ナビゲーションボタン */}
                    <button
                      onClick={handlePrevFile}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleNextFile}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                
                {hasMultipleFiles && currentFile ? (
                  /* 複数ファイルの場合 */
                  <a 
                    href={currentFile.filePath} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full h-full cursor-pointer"
                  >
                    {currentFile.fileType?.startsWith('image/') ? (
                      <img
                        src={currentFile.filePath}
                        alt={currentFile.fileName}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                        <img
                          src={getDefaultIcon(portfolio)}
                          alt={`${currentFile.fileType} ファイル`}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-200">
                      <span className="bg-white/90 text-primary px-4 py-2 rounded-md text-xs font-medium">
                        {currentFile.fileType?.startsWith('image/') ? '画像を表示' : 'ファイルを開く'}
                      </span>
                    </div>
                  </a>
                ) : previewImages[portfolio.id] ? (
                  <a 
                    href={portfolio.filePath || portfolio.url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full h-full cursor-pointer"
                  >
                    {/* アイコンかプレビュー画像を表示 */}
                    {previewImages[portfolio.id].endsWith('.svg') ? (
                      // ファイルアイコンの場合
                      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                        <img
                          src={previewImages[portfolio.id]}
                          alt={`${portfolio.title} アイコン`}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    ) : (
                      // プレビュー画像の場合
                      <img
                        src={previewImages[portfolio.id]}
                        alt={`成果物 ${portfolio.title}`}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // 画像読み込みエラー時はデフォルトアイコンを表示
                          e.currentTarget.src = '/assets/icons/file-icon.svg';
                          e.currentTarget.className = 'w-16 h-16 object-contain';
                          e.currentTarget.parentElement!.className = 'flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900';
                        }}
                      />
                    )}
                    {/* プレビュー表示ボタン（画像の上に重ねて表示） */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-200">
                      <button className="bg-white/90 text-primary px-4 py-2 rounded-md text-xs font-medium">
                        {portfolio.filePath ? 'ファイルを表示' : '成果物を見る'}
                      </button>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground">読み込み中...</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className="text-xs font-medium px-2 bg-background/80 backdrop-blur-sm border-background/50 text-black dark:text-black">
                    {workTypeLabels[portfolio.workType]}
                  </Badge>
                </div>
              </div>
              <CardContent className="flex-1 p-4">
                <h3 className="font-medium text-base truncate">{portfolio.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 h-10">
                  {portfolio.description}
                </p>
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <UserIcon className="w-3.5 h-3.5 mr-1.5" />
                    {getUserName(portfolio.userId)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
                  </div>
                  {/* プロジェクト情報 */}
                  <div className="mt-1">
                    {portfolio.project ? (
                      <Badge variant="secondary" className="text-xs">
                        <FolderOpen className="h-3 w-3 mr-1" />
                        {portfolio.project.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        プロジェクト未紐付け
                      </Badge>
                    )}
                  </div>
                  {/* 編集・削除ボタン（自分のポートフォリオまたは管理者の場合のみ表示） */}
                  {user && (portfolio.userId === user.id || user.role === 'ADMIN') && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPortfolio(portfolio);
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 text-xs"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPortfolio(portfolio);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="flex-1 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        削除
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-end mt-1">
                    {hasMultipleFiles && currentFile ? (
                      <a
                        href={currentFile.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                        download={currentFile.fileName}
                      >
                        {portfolio.files!.length > 1 ? (
                          <>
                            <FileStack className="h-3 w-3" />
                            {portfolio.files!.length}個のファイル
                          </>
                        ) : (
                          <>
                            ファイルを{currentFile.fileType?.startsWith('image/') ? '表示' : 'ダウンロード'}
                            {currentFile.fileType?.startsWith('image/') ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                          </>
                        )}
                      </a>
                    ) : portfolio.url ? (
                      <a
                        href={portfolio.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                      >
                        成果物を見る
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : portfolio.filePath ? (
                      <a
                        href={portfolio.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                        download={portfolio.title}
                      >
                        {portfolio.fileType?.startsWith('image/') ? 'ファイルを表示' : 'ファイルをダウンロード'}
                        {portfolio.fileType?.startsWith('image/') ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                      </a>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
          {(!portfolios || portfolios.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 bg-muted/30 rounded-xl col-span-full">
              <div className="text-center max-w-md p-6">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Tag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">成果物がありません</h3>
                <p className="text-muted-foreground mb-6">
                  まだ成果物が登録されていません。プロジェクトの完成後に成果物を追加されます。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ポートフォリオ作成・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>
              {selectedPortfolio ? "成果物を編集" : "新規成果物の追加"}
            </DialogTitle>
            <DialogDescription>
              {selectedPortfolio
                ? "既存の成果物の情報を更新します。"
                : "新しい成果物を追加します。"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-2">
            <PortfolioForm
              onSubmit={(data) => {
                if (selectedPortfolio) {
                  updatePortfolioMutation.mutate(data);
                } else {
                  createPortfolioMutation.mutate(data as InsertPortfolio);
                }
              }}
              defaultValues={selectedPortfolio || {
                userId: user?.id || 0,
                title: selectedPortfolio?.title || "",
                description: selectedPortfolio?.description || "",
                url: selectedPortfolio?.url || "",
                workType: selectedPortfolio?.workType || undefined,
                isPublic: selectedPortfolio?.isPublic ?? true,
                filePath: selectedPortfolio?.filePath || null,
                fileType: selectedPortfolio?.fileType || null,
                imageUrl: selectedPortfolio?.imageUrl || null,
                projectId: selectedPortfolio?.projectId || null
              }}
              isSubmitting={
                createPortfolioMutation.isPending || updatePortfolioMutation.isPending
              }
              currentUserId={user?.id || 0}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ポートフォリオ削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>成果物の削除</AlertDialogTitle>
            <AlertDialogDescription>
              本当に「{selectedPortfolio?.title}」を削除しますか？
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePortfolioMutation.mutate()}
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