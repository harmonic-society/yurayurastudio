import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { type Portfolio } from "@shared/schema";
import { useState, useEffect } from "react";

interface PortfolioListProps {
  projectId: number;
  portfolios: Portfolio[];
  onEdit?: (portfolio: Portfolio) => void;
  onDelete?: (portfolio: Portfolio) => void;
}

export default function PortfolioList({
  projectId,
  portfolios,
  onEdit,
  onDelete
}: PortfolioListProps) {
  const [previewImages, setPreviewImages] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchOgpImages = async () => {
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

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {portfolios.map((portfolio) => (
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
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{portfolio.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {portfolio.description}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(portfolio)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(portfolio)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-1">
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
      {portfolios.length === 0 && (
        <p className="text-center text-muted-foreground col-span-full">
          まだ成果物が登録されていません
        </p>
      )}
    </div>
  );
}