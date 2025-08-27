import { useState, useEffect } from "react";
import { type ProjectFile } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, ExternalLink, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FilePreviewProps {
  file: ProjectFile | null;
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilePreview({ file, projectId, isOpen, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | "text" | "video" | "audio" | "unsupported">("unsupported");
  const { toast } = useToast();

  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewUrl(null);
      setPreviewContent(null);
      return;
    }

    // ファイルタイプを判定
    const fileType = file.fileType.toLowerCase();
    const fileName = file.fileName.toLowerCase();
    
    if (fileType.startsWith("image/") || 
        [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].some(ext => fileName.endsWith(ext))) {
      setPreviewType("image");
      loadPreview();
    } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      setPreviewType("pdf");
      loadPreview();
    } else if (fileType.startsWith("video/") || 
               [".mp4", ".webm", ".ogg", ".mov"].some(ext => fileName.endsWith(ext))) {
      setPreviewType("video");
      loadPreview();
    } else if (fileType.startsWith("audio/") || 
               [".mp3", ".wav", ".ogg", ".m4a"].some(ext => fileName.endsWith(ext))) {
      setPreviewType("audio");
      loadPreview();
    } else if (fileType.startsWith("text/") || 
               fileType === "application/json" ||
               fileType === "application/javascript" ||
               fileType === "application/typescript" ||
               fileType === "application/xml" ||
               [".txt", ".md", ".json", ".xml", ".csv", ".log", ".yml", ".yaml", 
                ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".scss", ".sass",
                ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".cs", ".php", ".rb",
                ".go", ".rs", ".swift", ".kt", ".dart", ".r", ".sql", ".sh", ".bash",
                ".dockerfile", ".env", ".gitignore", ".editorconfig"].some(ext => fileName.endsWith(ext))) {
      setPreviewType("text");
      loadTextContent();
    } else {
      setPreviewType("unsupported");
    }
  }, [file, isOpen]);

  const loadPreview = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      // Google Driveファイルの場合は埋め込みURL、通常ファイルはダウンロードエンドポイント
      let url: string;
      if ((file as any).sourceType === 'google_drive' && (file as any).googleDriveId) {
        // Google Driveの埋め込みURLを生成
        url = `https://drive.google.com/file/d/${(file as any).googleDriveId}/preview`;
      } else {
        url = `/api/projects/${projectId}/files/${file.id}/download`;
      }
      setPreviewUrl(url);
    } catch (error) {
      console.error("プレビュー読み込みエラー:", error);
      toast({
        title: "エラー",
        description: "ファイルのプレビューを読み込めませんでした",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTextContent = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      // Google Driveファイルの場合はテキストプレビュー非対応
      if ((file as any).sourceType === 'google_drive') {
        setPreviewType("unsupported");
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/files/${file.id}/download`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("ファイルの読み込みに失敗しました");
      }

      const text = await response.text();
      
      // ファイルサイズが大きすぎる場合は一部のみ表示
      const maxLength = 100000; // 100KB
      if (text.length > maxLength) {
        setPreviewContent(text.substring(0, maxLength) + "\n\n... (ファイルが大きすぎるため、最初の100KBのみ表示しています)");
      } else {
        setPreviewContent(text);
      }
    } catch (error) {
      console.error("テキスト読み込みエラー:", error);
      toast({
        title: "エラー",
        description: "ファイルの内容を読み込めませんでした",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!file) return;
    
    // Google Driveファイルの場合はGoogle Driveで開く
    if ((file as any).sourceType === 'google_drive' && (file as any).googleDriveUrl) {
      window.open((file as any).googleDriveUrl, '_blank');
    } else {
      const downloadUrl = `/api/projects/${projectId}/files/${file.id}/download`;
      window.open(downloadUrl, '_blank');
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'r': 'r',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'md': 'markdown',
      'dockerfile': 'dockerfile',
    };
    return languageMap[ext] || 'plaintext';
  };

  const renderPreview = () => {
    if (!file) return null;

    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }

    switch (previewType) {
      case "image":
        return (
          <div className="relative">
            <img
              src={previewUrl || ""}
              alt={file.fileName}
              className="max-w-full h-auto rounded-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                toast({
                  title: "エラー",
                  description: "画像を読み込めませんでした",
                  variant: "destructive",
                });
              }}
            />
          </div>
        );

      case "pdf":
        return (
          <div className="w-full h-[600px] border rounded-md">
            <iframe
              src={previewUrl || ""}
              className="w-full h-full rounded-md"
              title={file.fileName}
            />
          </div>
        );

      case "video":
        return (
          <video
            controls
            className="w-full rounded-md"
            src={previewUrl || ""}
          >
            お使いのブラウザは動画の再生に対応していません。
          </video>
        );

      case "audio":
        return (
          <div className="p-8">
            <audio
              controls
              className="w-full"
              src={previewUrl || ""}
            >
              お使いのブラウザは音声の再生に対応していません。
            </audio>
          </div>
        );

      case "text":
        return (
          <ScrollArea className="h-[500px] w-full border rounded-md">
            <pre className={`p-4 text-sm overflow-x-auto language-${getLanguageFromFileName(file.fileName)}`}>
              <code>{previewContent || "内容を読み込み中..."}</code>
            </pre>
          </ScrollArea>
        );

      case "unsupported":
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              このファイル形式のプレビューはサポートされていません
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              ファイルタイプ: {file.fileType}
            </p>
            <Button onClick={handleDownload}>
              {(file as any).sourceType === 'google_drive' ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Driveで開く
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  ファイルをダウンロード
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{file?.fileName}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                ダウンロード
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}