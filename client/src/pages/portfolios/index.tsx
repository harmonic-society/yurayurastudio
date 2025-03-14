import { useQuery } from "@tanstack/react-query";
import { type Portfolio, type User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useState, useEffect } from "react";

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

  if (isLoadingPortfolios) {
    return <div>読み込み中...</div>;
  }

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ポートフォリオ</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          全プロジェクトの成果物一覧
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {portfolios?.map((portfolio) => (
          <Card key={portfolio.id} className="flex flex-col">
            <div className="relative aspect-video">
              {previewImages[portfolio.id] ? (
                <img
                  src={previewImages[portfolio.id]}
                  alt={`成果物 ${portfolio.title}`}
                  className="object-cover w-full h-full rounded-t-lg"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted rounded-t-lg">
                  <p className="text-sm text-muted-foreground">画像を読み込み中...</p>
                </div>
              )}
            </div>
            <CardContent className="flex-1 pt-4">
              <h3 className="font-medium line-clamp-1">{portfolio.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {portfolio.description}
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  担当: {getUserName(portfolio.userId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  作業種別: {workTypeLabels[portfolio.workType]}
                </p>
                <p className="text-xs text-muted-foreground">
                  作成日: {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
                </p>
                <a
                  href={portfolio.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline inline-block mt-2"
                >
                  成果物を見る
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!portfolios || portfolios.length === 0) && (
          <p className="text-center text-muted-foreground col-span-full">
            まだ成果物が登録されていません
          </p>
        )}
      </div>
    </div>
  );
}