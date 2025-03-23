import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { type Portfolio } from "@shared/schema";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PortfolioListProps {
  projectId: number;
  portfolios: Portfolio[];
  onEdit?: (portfolio: Portfolio) => void;
  onDelete?: (portfolio: Portfolio) => void;
  showTooltips?: boolean;
}

export default function PortfolioList({
  projectId,
  portfolios,
  onEdit,
  onDelete,
  showTooltips = false
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

  // 管理権限ツールチップラッパー
  const WithTooltip = ({ 
    children, 
    show, 
    label 
  }: { 
    children: React.ReactNode, 
    show: boolean, 
    label: string 
  }) => {
    if (show) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{children}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{`成果物の${label}は管理者のみが行えます`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <>{children}</>;
  };

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {portfolios.map((portfolio) => (
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
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <WithTooltip show={showTooltips && !onEdit} label="編集">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={onEdit ? () => onEdit(portfolio) : undefined}
                  disabled={!onEdit}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </WithTooltip>
              
              <WithTooltip show={showTooltips && !onDelete} label="削除">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={onDelete ? () => onDelete(portfolio) : undefined}
                  disabled={!onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </WithTooltip>
            </div>
          </div>
          <CardContent className="flex-1 p-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-base">{portfolio.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 h-10">
                {portfolio.description}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
              </p>
              <a
                href={portfolio.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                成果物を見る
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 7h10v10" />
                  <path d="M7 17 17 7" />
                </svg>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
      {portfolios.length === 0 && (
        <p className="text-center text-muted-foreground col-span-full py-12">
          まだ成果物が登録されていません
        </p>
      )}
    </div>
  );
}