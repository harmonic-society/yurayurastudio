import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { insertPortfolioSchema, type User, type InsertPortfolio, type Project } from "@shared/schema";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FileUp, LinkIcon, X } from "lucide-react";

interface PortfolioFormProps {
  onSubmit: (data: InsertPortfolio | FormData) => void;
  defaultValues?: Partial<InsertPortfolio>;
  isSubmitting?: boolean;
  currentUserId: number; // 現在のユーザーIDを追加
  projectId?: number; // プロジェクトID（オプション）
}

export default function PortfolioForm({
  onSubmit,
  defaultValues,
  isSubmitting,
  currentUserId,
  projectId
}: PortfolioFormProps) {
  const { isAdmin } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string>(defaultValues?.url || "");
  const [previewImage, setPreviewImage] = useState<string>("");
  const [submitMode, setSubmitMode] = useState<"url" | "file">(defaultValues?.url ? "url" : "file");
  
  // ファイルアップロード関連の状態
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchOgpImage = async () => {
      if (!previewUrl) {
        setPreviewImage("");
        return;
      }

      try {
        const response = await fetch(`/api/ogp?url=${encodeURIComponent(previewUrl)}`);
        if (!response.ok) {
          setPreviewImage("");
          return;
        }
        const data = await response.json();
        setPreviewImage(data.imageUrl);
      } catch (error) {
        console.error('Failed to fetch OGP image:', error);
        setPreviewImage("");
      }
    };

    fetchOgpImage();
  }, [previewUrl]);

  // フォームのデフォルト値を設定
  const defaultFormValues = {
    title: defaultValues?.title || "",
    description: defaultValues?.description || "",
    url: defaultValues?.url || "",
    userId: defaultValues?.userId || currentUserId,
    projectId: defaultValues?.projectId || projectId || null,
    workType: defaultValues?.workType || undefined,
    isPublic: defaultValues?.isPublic ?? true,
    filePath: defaultValues?.filePath || null,
    fileType: defaultValues?.fileType || null,
    imageUrl: defaultValues?.imageUrl || null
  };
  
  console.log('フォームのデフォルト値:', defaultFormValues);
  
  const form = useForm<InsertPortfolio>({
    resolver: zodResolver(insertPortfolioSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange' // 入力時にバリデーションを行う
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });
  
  // デバッグ用
  useEffect(() => {
    if (projects) {
      console.log('取得したプロジェクト:', projects);
    }
  }, [projects]);

  const roleLabels = {
    ADMIN: "管理者",
    DIRECTOR: "ディレクター",
    SALES: "営業担当",
    CREATOR: "クリエイター"
  } as const;

  const workTypeLabels = {
    DESIGN: "デザイン",
    DEVELOPMENT: "開発",
    WRITING: "ライティング",
    VIDEO: "動画",
    PHOTO: "写真"
  } as const;

  if (!users) return null;

  // ファイル選択ハンドラー
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    console.log('ファイル選択:', files.map(f => `${f.name} (${f.type}, ${f.size}bytes)`).join(', '));
    setSelectedFiles(files);
    
    // 各ファイルのプレビューを生成
    const newPreviews: { file: File; preview: string }[] = [];
    let processedCount = 0;

    files.forEach((file) => {
      // 画像ファイルの場合はプレビューを生成
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push({ file, preview: e.target.result as string });
            processedCount++;
            if (processedCount === files.length) {
              setFilePreviews(newPreviews);
              console.log('全画像プレビュー生成完了');
            }
          }
        };
        reader.onerror = (error) => {
          console.error('画像読み込みエラー:', error);
          processedCount++;
          if (processedCount === files.length) {
            setFilePreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // 画像以外のファイルタイプに応じたアイコンを表示
        let iconPath = '/assets/icons/file-icon.svg';
        
        if (file.type === 'application/pdf') {
          iconPath = '/assets/icons/pdf-icon.svg';
        } else if (file.type.includes('word') || file.type.includes('document')) {
          iconPath = '/assets/icons/word-icon.svg';
        } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
          iconPath = '/assets/icons/excel-icon.svg';
        } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
          iconPath = '/assets/icons/powerpoint-icon.svg';
        }
        
        console.log('ファイルアイコン設定:', iconPath);
        newPreviews.push({ file, preview: iconPath });
        processedCount++;
        if (processedCount === files.length) {
          setFilePreviews(newPreviews);
        }
      }
    });
  };

  // 選択したファイルを削除する関数
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (data: InsertPortfolio) => {
    try {
      console.log('フォーム送信データ:', JSON.stringify(data, null, 2));
      
      // フォームの現在の状態をログ出力
      console.log('フォーム状態:', {
        isDirty: form.formState.isDirty,
        isValid: form.formState.isValid,
        dirtyFields: Object.keys(form.formState.dirtyFields),
        touchedFields: Object.keys(form.formState.touchedFields),
      });
      
      // エラーの詳細をログ出力
      if (Object.keys(form.formState.errors).length > 0) {
        console.error('フォームエラー詳細:', JSON.stringify(form.formState.errors, null, 2));
      }
      
      // バリデーションチェック - 必須フィールドの確認
      let hasError = false;
      
      if (!data.title || data.title.trim().length === 0) {
        form.setError('title', {
          type: 'manual',
          message: 'タイトルは必須です'
        });
        console.error('タイトルエラー: 空または未入力');
        hasError = true;
      }
      
      if (!data.description || data.description.trim().length === 0) {
        form.setError('description', {
          type: 'manual',
          message: '説明は必須です'
        });
        console.error('説明エラー: 空または未入力');
        hasError = true;
      }
      
      if (!data.workType) {
        form.setError('workType', {
          type: 'manual',
          message: '作業種別を選択してください'
        });
        console.error('作業種別エラー: 未選択');
        hasError = true;
      }
      
      // 提出モードに応じた追加バリデーション
      if (submitMode === "url") {
        if (!data.url || data.url.trim().length === 0) {
          form.setError('url', {
            type: 'manual',
            message: 'URLを入力してください'
          });
          console.error('URLエラー: 空または未入力');
          hasError = true;
        }
      } else if (submitMode === "file") {
        if (selectedFiles.length === 0) {
          form.setError('root', {
            type: 'manual',
            message: 'ファイルを選択してください'
          });
          console.error('ファイルエラー: 未選択');
          hasError = true;
        }
      }
      
      // 必須フィールドの値をコンソールに表示
      console.log('必須フィールド値:', {
        title: data.title || '未入力',
        description: data.description || '未入力',
        workType: data.workType || '未選択',
        submitMode: submitMode,
        hasFile: selectedFiles.length > 0,
        hasUrl: !!data.url
      });
      
      if (hasError) {
        console.error('フォームバリデーションエラー:', Object.keys(form.formState.errors));
        return;
      }
      
      if (submitMode === "url") {
        // URL提出モード
        // 上のバリデーションでチェック済みなのでここでは追加チェックしない
        
        try {
          // URLの形式チェック
          if (data.url) {
            new URL(data.url);
          } else {
            throw new Error("URLが未入力です");
          }
        } catch (e) {
          form.setError('url', {
            type: 'manual',
            message: '有効なURLを入力してください'
          });
          return;
        }
        
        const submitData = {
          userId: Number(data.userId),
          projectId: data.projectId ? Number(data.projectId) : null,
          title: data.title.trim(),
          description: data.description.trim(),
          url: data.url ? data.url.trim() : "",
          workType: data.workType,
          isPublic: data.isPublic ?? true,
          filePath: null,
          fileType: null,
          imageUrl: previewImage || null
        };
        await onSubmit(submitData);
      } else {
        // ファイル提出モード
        // 上のバリデーションでチェック済みなのでここでは追加チェックしない
        if (selectedFiles.length === 0) {
          throw new Error('ファイルが選択されていません');
        }

        const formData = new FormData();
        
        // 複数ファイルを追加
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        
        formData.append('userId', data.userId.toString());
        if (data.projectId) {
          formData.append('projectId', data.projectId.toString());
        }
        formData.append('title', data.title.trim());
        formData.append('description', data.description.trim());
        formData.append('workType', data.workType);
        formData.append('isPublic', (data.isPublic ?? true).toString());
        
        console.log('ファイルアップロード開始:', selectedFiles.map(f => `${f.name} (${f.type}, ${f.size}bytes)`).join(', '));
        
        // ファイル提出モード（FormDataを使用）
        const response = await fetch('/api/portfolios/upload', {
          method: 'POST',
          body: formData,
        });
        
        console.log('ファイルアップロードレスポンス:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('ファイルアップロードエラー:', errorData);
          throw new Error(errorData.message || 'ファイルのアップロードに失敗しました');
        }
        
        const result = await response.json();
        console.log('ファイルアップロード成功:', result);
        
        // 結果をフォームデータにマージ
        const submitData: InsertPortfolio = {
          userId: Number(data.userId),
          projectId: data.projectId ? Number(data.projectId) : null,
          title: data.title.trim(),
          description: data.description.trim(),
          url: "", // データベースのNOT NULL制約のため空文字列を設定
          workType: data.workType,
          isPublic: data.isPublic ?? true,
          filePath: result.filePath || result.filePaths?.[0] || null, // 複数ファイルの場合も対応
          fileType: result.fileType || result.fileTypes?.[0] || null,
          imageUrl: result.previewImageUrl || result.previewImageUrls?.[0] || null
        };
        
        console.log('送信データ:', JSON.stringify(submitData, null, 2));
        
        await onSubmit(submitData);
      }
    } catch (error) {
      console.error('Portfolio form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'フォームの送信に失敗しました';
      form.setError('root', {
        type: 'manual',
        message: errorMessage
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        {isAdmin ? (
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>担当者<span className="text-destructive">*</span></FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="担当者を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[9999]" style={{ zIndex: 9999 }}>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}（{roleLabels[user.role]}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <input type="hidden" name="userId" value={currentUserId} />
        )}

        {/* プロジェクトがpropsから渡されていない場合のみ、プロジェクト選択を表示 */}
        {!projectId && (
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>紐付けるプロジェクト（任意）</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === "0" ? null : Number(value))}
                  value={field.value?.toString() || "0"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="プロジェクトを選択（任意）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px] overflow-y-auto" style={{ zIndex: 9999 }}>
                    <SelectItem value="0">なし</SelectItem>
                    {projectsLoading ? (
                      <SelectItem value="loading" disabled>読み込み中...</SelectItem>
                    ) : projects && projects.length > 0 ? (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.projectNumber ? `#${project.projectNumber} - ` : ''}{project.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-projects" disabled>プロジェクトがありません</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  このポートフォリオを特定のプロジェクトに紐付けることができます
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="workType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>作業種別<span className="text-destructive">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="作業種別を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-[9999]" style={{ zIndex: 9999 }}>
                  {Object.entries(workTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル<span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="成果物のタイトルを入力" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明<span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="成果物の説明を入力"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-md p-4">
          <Tabs 
            defaultValue={submitMode} 
            onValueChange={(value) => setSubmitMode(value as "url" | "file")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URLで追加
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                ファイルをアップロード
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="pt-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>成果物のURL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="成果物へのリンクを入力"
                        onChange={(e) => {
                          field.onChange(e);
                          setPreviewUrl(e.target.value);
                        }}
                        value={field.value || ""}
                      />
                    </FormControl>
                    {previewUrl && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-2">プレビュー:</p>
                        {previewImage ? (
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                            <img
                              src={previewImage}
                              alt="プレビュー"
                              className="object-cover w-full h-full"
                              onError={() => setPreviewImage("")}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">画像を読み込み中...</p>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            <TabsContent value="file" className="pt-4">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center w-full">
                  <label
                    htmlFor="fileUpload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">クリックしてファイルを選択</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF、画像ファイル（JPEG、PNG、GIF）、Office文書、テキストファイル
                      </p>
                    </div>
                    <input
                      id="fileUpload"
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                      multiple
                    />
                  </label>
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2">選択したファイル ({selectedFiles.length}ファイル):</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedFiles.map((file, index) => {
                        const preview = filePreviews.find(p => p.file === file);
                        return (
                          <div key={index} className="relative group">
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-gray-50 flex items-center justify-center p-2">
                              {file.type.startsWith('image/') && preview ? (
                                <img
                                  src={preview.preview}
                                  alt={file.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : preview ? (
                                <div className="flex flex-col items-center justify-center">
                                  <img
                                    src={preview.preview}
                                    alt="ファイルアイコン"
                                    className="w-12 h-12 object-contain mb-1"
                                  />
                                  <span className="text-xs text-gray-600 text-center px-1 truncate w-full">
                                    {file.name}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  読み込み中...
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="ファイルを削除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="text-xs text-gray-500 mt-1 text-center truncate">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>公開設定</FormLabel>
                <FormDescription>
                  このポートフォリオを他のユーザーに公開しますか？
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "保存中..." : "成果物を保存"}
          </Button>
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="text-sm text-destructive">
              ※入力内容に誤りがあります。各項目のエラーメッセージを確認してください。
            </p>
          )}
        </div>
      </form>
    </Form>
  );
}