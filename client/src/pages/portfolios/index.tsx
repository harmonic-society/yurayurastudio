import { useQuery } from "@tanstack/react-query";
import { type Portfolio, type User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Loader2, ExternalLink, User as UserIcon, Calendar, Tag } from "lucide-react";

export default function Portfolios() {
  const { data: portfolios, isLoading: isLoadingPortfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"]
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchOgpImages = async () => {
      if (!portfolios) return;

      const images: Record<number, string> = {};
      for (const portfolio of portfolios) {
        try {
          const response = await fetch(`/api/ogp?url=${encodeURIComponent(portfolio.url)}`);
          if (response.ok) {
            const data = await response.json();
            images[portfolio.id] = data.imageUrl;
          }
        } catch (error) {
          console.error(`Failed to fetch OGP image for portfolio ${portfolio.id}:`, error);
        }
      }
      setPreviewImages(images);
    };

    fetchOgpImages();
  }, [portfolios]);

  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || "不明なユーザー";
  };

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">成果物ギャラリー</h1>
        <p className="text-muted-foreground">
          当チームが手がけたプロジェクトの実績一覧
        </p>
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
          {portfolios?.map((portfolio) => (
            <Card key={portfolio.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 group">
              <div className="relative h-40">
                {previewImages[portfolio.id] ? (
                  <img
                    src={previewImages[portfolio.id]}
                    alt={`成果物 ${portfolio.title}`}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-muted">
                    <p className="text-sm text-muted-foreground">画像を読み込み中...</p>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className="text-xs font-medium px-2 bg-background/80 backdrop-blur-sm border-background/50">
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
                  <div className="flex justify-end mt-1">
                    <a
                      href={portfolio.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      成果物を見る
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
}