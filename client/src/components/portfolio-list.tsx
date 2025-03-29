import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, FileIcon, ExternalLink, Download } from "lucide-react";
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
  portfolios: Portfolio[];
  onEdit?: (portfolio: Portfolio) => void;
  onDelete?: (portfolio: Portfolio) => void;
  showTooltips?: boolean;
}

export default function PortfolioList({
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
        if (portfolio.url) { // URL形式のポートフォリオのみOGP画像を取得
          try {
            const response = await fetch(`/api/ogp?url=${encodeURIComponent(portfolio.url)}`);
            if (response.ok) {
              const data = await response.json();
              images[portfolio.id] = data.imageUrl;
            }
          } catch (error) {
            console.error(`Failed to fetch OGP image for portfolio ${portfolio.id}:`, error);
          }
        } else if (portfolio.imageUrl) { // すでに保存されているイメージURLがある場合
          images[portfolio.id] = portfolio.imageUrl;
        }
      }

      setPreviewImages(images);
    };

    fetchOgpImages();
  }, [portfolios]);

  // ファイルタイプからアイコンを取得する
  const getFileTypeIcon = (fileType: string | null) => {
    if (!fileType) return null;
    
    if (fileType.startsWith('image/')) {
      return null; // 画像はプレビュー表示されるので不要
    } else if (fileType === 'application/pdf') {
      return '/assets/icons/pdf-icon.png';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return '/assets/icons/word-icon.png';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return '/assets/icons/excel-icon.png';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return '/assets/icons/powerpoint-icon.png';
    } else {
      return '/assets/icons/file-icon.png';
    }
  };

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
      {portfolios.map((portfolio) => {
        const isFileType = !portfolio.url && portfolio.filePath;
        const fileTypeIcon = isFileType ? getFileTypeIcon(portfolio.fileType) : null;
        const isImageFile = portfolio.fileType?.startsWith('image/');
        
        return (
          <Card key={portfolio.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 group">
            <div className="relative h-40">
              {/* 画像表示エリア */}
              {previewImages[portfolio.id] ? (
                // OGP画像またはイメージURLがある場合
                <img
                  src={previewImages[portfolio.id]}
                  alt={`成果物 ${portfolio.title}`}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              ) : isFileType && isImageFile ? (
                // 画像ファイルの場合、ファイルパスから直接表示
                <img
                  src={portfolio.filePath || ''}
                  alt={`成果物 ${portfolio.title}`}
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              ) : isFileType && fileTypeIcon ? (
                // ファイルタイプのアイコンを表示
                <div className="flex items-center justify-center w-full h-full bg-gray-50">
                  <img
                    src={fileTypeIcon}
                    alt={`${portfolio.fileType} ファイル`}
                    className="w-20 h-20 object-contain"
                  />
                </div>
              ) : (
                // プレビューなし
                <div className="flex items-center justify-center w-full h-full bg-muted">
                  <FileIcon className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
              )}
              
              {/* 編集/削除ボタン */}
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
                
                {/* URL形式とファイル形式で表示を分ける */}
                {portfolio.url ? (
                  <a
                    href={portfolio.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    成果物を見る
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : portfolio.filePath ? (
                  <a
                    href={portfolio.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    download={portfolio.title}
                  >
                    ファイルを{isImageFile ? '表示' : 'ダウンロード'}
                    {isImageFile ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {portfolios.length === 0 && (
        <p className="text-center text-muted-foreground col-span-full py-12">
          まだ成果物が登録されていません
        </p>
      )}
    </div>
  );
}