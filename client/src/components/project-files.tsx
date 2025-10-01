import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ProjectFile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Upload, 
  Download, 
  Trash2, 
  File, 
  FileText, 
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  Eye,
  Cloud
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import FilePreview from "./file-preview";
import GoogleDrivePicker from "./google-drive-picker";

interface ProjectFilesProps {
  projectId: number;
  isAdmin: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
  if (fileType.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
  if (fileType.startsWith('audio/')) return <FileAudio className="h-4 w-4" />;
  if (fileType.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-4 w-4 text-blue-600" />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileText className="h-4 w-4 text-orange-600" />;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return <FileArchive className="h-4 w-4" />;
  if (fileType.includes('javascript') || fileType.includes('typescript') || fileType.includes('json') || fileType.includes('html') || fileType.includes('css')) return <FileCode className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default function ProjectFiles({ projectId, isAdmin }: ProjectFilesProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isGoogleDriveMode, setIsGoogleDriveMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ファイル一覧の取得
  const { data: files = [], isLoading } = useQuery<ProjectFile[]>({
    queryKey: [`/api/projects/${projectId}/files`],
  });

  // ファイルアップロード
  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("description", description);

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "ファイルのアップロードに失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setDescription("");
      toast({
        title: "成功",
        description: "ファイルがアップロードされました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ファイル削除
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
      toast({
        title: "成功",
        description: "ファイルが削除されました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Google Driveファイルの紐付け
  const googleDriveMutation = useMutation({
    mutationFn: async (fileData: {
      id: string;
      name: string;
      mimeType: string;
      url: string;
      size?: number;
      description: string;
    }) => {
      return apiRequest(`/api/projects/${projectId}/google-drive-files`, {
        method: "POST",
        body: JSON.stringify(fileData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      setIsUploadDialogOpen(false);
      setDescription("");
      setIsGoogleDriveMode(false);
      toast({
        title: "成功",
        description: "Google Driveファイルを紐付けました",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    if (!uploadFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ file: uploadFile, description });
  };

  const handleGoogleDriveSelect = (file: {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    size?: number;
  }) => {
    googleDriveMutation.mutate({
      ...file,
      description,
    });
  };

  const handleFileDownload = (file: ProjectFile) => {
    const downloadUrl = `/api/projects/${projectId}/files/${file.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  const handleFileDelete = () => {
    if (selectedFile) {
      deleteMutation.mutate(selectedFile.id);
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>プロジェクトファイル</CardTitle>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          ファイルをアップロード
        </Button>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            ファイルがアップロードされていません
          </p>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {getFileIcon(file.fileType)}
                    {(file as any).sourceType === 'google_drive' && (
                      <Cloud className="h-3 w-3 absolute -bottom-1 -right-1 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{file.fileName}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {(file as any).sourceType === 'google_drive' ? (
                        <span className="flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          Google Drive
                        </span>
                      ) : (
                        <span>{formatFileSize(file.fileSize)}</span>
                      )}
                      <span>
                        アップロード: {file.uploadedByUser || "不明"} • {format(new Date(file.createdAt), "yyyy/MM/dd HH:mm")}
                      </span>
                    </div>
                    {file.description && (
                      <p className="text-sm mt-1">{file.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewFile(file);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileDownload(file)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {(isAdmin || file.uploadedBy === parseInt(localStorage.getItem("userId") || "0")) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(file);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ファイルアップロードダイアログ */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
        setIsUploadDialogOpen(open);
        if (!open) {
          setIsGoogleDriveMode(false);
          setUploadFile(null);
          setDescription("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isGoogleDriveMode ? "Google Driveから選択" : "ファイルをアップロード"}
            </DialogTitle>
            <DialogDescription>
              {isGoogleDriveMode 
                ? "Google Driveからファイルを選択して紐付けます" 
                : "プロジェクトに関連するファイルをアップロードします（最大100MB）"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={isGoogleDriveMode ? "outline" : "default"}
                size="sm"
                onClick={() => setIsGoogleDriveMode(false)}
              >
                <Upload className="h-4 w-4 mr-2" />
                ファイルアップロード
              </Button>
              <Button
                variant={isGoogleDriveMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsGoogleDriveMode(true)}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Google Drive
              </Button>
            </div>
            
            {isGoogleDriveMode ? (
              <div>
                <GoogleDrivePicker
                  onFileSelect={handleGoogleDriveSelect}
                  disabled={googleDriveMutation.isPending}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="file">ファイル</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 100 * 1024 * 1024) {
                        toast({
                          title: "エラー",
                          description: "ファイルサイズは100MB以下にしてください",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      setUploadFile(file);
                    }
                  }}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="description">説明（任意）</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ファイルの説明を入力..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setIsGoogleDriveMode(false);
                setUploadFile(null);
                setDescription("");
              }}
            >
              キャンセル
            </Button>
            {!isGoogleDriveMode && (
              <Button
                onClick={handleFileUpload}
                disabled={!uploadFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "アップロード中..." : "アップロード"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ファイル削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ファイルの削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedFile?.fileName}」を削除してもよろしいですか？
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFileDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ファイルプレビューダイアログ */}
      <FilePreview
        file={previewFile}
        projectId={projectId}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
      />
    </Card>
  );
}