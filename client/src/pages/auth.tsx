import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registrationRequestSchema, registrationRoles } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  User, 
  Key, 
  Briefcase, 
  AlertCircle,
  CheckCircle,
  Loader2,
  HelpCircle,
  Info,
  ArrowRight,
  Users,
  Calendar,
  Gauge,
  BarChart,
  MessageSquare,
  Building2,
  FileText,
  Lock,
  ShieldCheck
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const roleLabels = {
  DIRECTOR: "ディレクター",
  SALES: "営業担当",
  CREATOR: "クリエイター"
} as const;

const roleDescriptions = {
  DIRECTOR: "プロジェクト全体を統括し、リソース配分やスケジュール管理を行います",
  SALES: "クライアントとの窓口となり、案件獲得や顧客管理を担当します",
  CREATOR: "実際の制作作業を担当し、高品質な成果物を提供します"
} as const;

export default function AuthPage() {
  // すべてのフックを最初に呼び出す
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(registrationRequestSchema.pick({ 
      username: true, 
      password: true 
    })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registrationRequestSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "" as any, // 型エラーを解消するために明示的に型キャスト
    },
  });

  // 登録リクエスト用のミューテーション
  const registerMutation: UseMutationResult<any, Error, any> = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/registration-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
      registerForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "登録に失敗しました",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ログイン済みの場合はリダイレクト
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* サイドイメージパネル */}
      <div className="relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r overflow-hidden">
        {/* バックグラウンド画像 */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/chiba-creative.jpeg" 
            alt="千葉クリエイティブ" 
            className="h-full w-full object-cover object-center brightness-[0.35] contrast-[1.1]"
          />
        </div>
        
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/60 to-primary/50 z-10 mix-blend-multiply" />
        
        {/* オーバーレイパターン */}
        <div className="absolute inset-0 opacity-10 z-10" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ffffff" fill-opacity="0.8" fill-rule="evenodd"%3E%3Ccircle cx="3" cy="3" r="1.5"/%3E%3Ccircle cx="13" cy="13" r="1.5"/%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '24px 24px'
        }} />
        
        <div className="relative z-20 flex items-center text-lg font-medium bg-black/30 backdrop-blur-sm px-4 py-3 rounded-lg shadow-md">
          <img 
            src="/logo.png" 
            alt="Yura Yura STUDIO" 
            className="h-32 w-auto object-contain"
          />
        </div>
        
        <div className="relative z-20 flex flex-col h-full mt-6">
          <div className="flex-grow flex flex-col justify-center">
            {/* 魅力的なコピー - カバー画像に合わせて調整 */}
            <blockquote className="space-y-6 backdrop-blur-sm bg-black/30 p-6 rounded-xl shadow-xl border border-white/10 max-w-xl">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-white">千葉と共に成長する<br/>クリエイティブの力</h2>
                <p className="text-lg leading-relaxed font-medium text-white/90 mt-3">
                  Yura Yura STUDIOは、<span className="bg-primary/40 px-2 py-0.5 rounded mx-1 text-white">千葉県</span>の事業者とクリエイターをつなぐプロジェクト管理プラットフォーム
                </p>
              </div>
              
              {/* アイコンとタグライン */}
              <div className="flex items-center gap-4 my-6 border-t border-b border-white/20 py-4">
                <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm shadow-lg h-20 w-20 flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Yura Yura Studio Icon" 
                    className="rounded-md transition-all duration-300 hover:transform hover:scale-110 w-full h-full object-contain" 
                  />
                </div>
                <div className="flex-1">
                  <div className="text-white text-lg font-semibold">地域と創るWebの未来</div>
                  <div className="text-white/80 text-sm mt-1">地域密着型プロジェクトのためのプラットフォーム</div>
                </div>
              </div>
              
              <div className="pt-3">
                <h3 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
                  あなたの参加で広がる可能性
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg">
                    <div className="bg-white/30 p-1.5 rounded-full mt-0.5 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">地域に根ざしたプロジェクト</span>
                      <p className="text-white/70 text-xs mt-0.5">千葉の事業者と直接繋がり、地元での実績を積めます</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg">
                    <div className="bg-white/30 p-1.5 rounded-full mt-0.5 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">公平な報酬システム</span>
                      <p className="text-white/70 text-xs mt-0.5">スキルと貢献度に基づいた透明性のある報酬配分</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-white/10 p-3 rounded-lg">
                    <div className="bg-white/30 p-1.5 rounded-full mt-0.5 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">拡張ポートフォリオ機能</span>
                      <p className="text-white/70 text-xs mt-0.5">URL・ファイル添付に対応したポートフォリオで実績を効果的に共有</p>
                    </div>
                  </li>
                </ul>
              </div>
            </blockquote>
          </div>
          
          {/* フッターエリアとCTA */}
          <div className="mt-auto">
            <div className="backdrop-blur-sm bg-black/40 p-5 rounded-lg border border-white/10 shadow-lg mb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-primary/30 px-3 py-1 rounded-full text-white text-xs font-medium tracking-wide animate-pulse flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <span>クリエイター登録受付中</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-white/90 text-xs">オンライン</span>
                </div>
              </div>
              
              <div className="flex justify-center mb-3">
                <button 
                  onClick={() => {
                    setActiveTab("register");
                    // スムーズにスクロールしてフォームに移動 
                    document.querySelector('.lg\\:grid-cols-2')?.scrollIntoView({ behavior: 'smooth' });
                    // タブにフォーカス
                    const registerTab = document.querySelector('[value="register"]');
                    if (registerTab instanceof HTMLElement) {
                      setTimeout(() => registerTab.focus(), 500);
                    }
                  }} 
                  className="group relative w-full"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-primary to-yellow-400 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-500 group-hover:duration-200 animate-pulse"></div>
                  <div className="relative flex items-center justify-center gap-2 w-full bg-white text-primary hover:bg-white/95 font-bold px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl">
                    <UserPlus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="tracking-wide text-base">今すぐ登録する</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Yura Yura Studio Icon" className="h-12 w-auto object-contain" />
                  <p className="text-xs text-white/80 font-medium">
                    Harmonic Society株式会社
                  </p>
                </div>
                <a 
                  href="https://harmonic-society.co.jp/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>公式サイト</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                </a>
              </div>
            </div>
            
            <div className="flex justify-center">
              <p className="text-white/70 text-xs">
                © 2025 Harmonic Society All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* ログイン/登録フォームパネル */}
      <div className="p-4 lg:p-8 flex items-center justify-center bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center mb-4">
            <img 
              src="/logo.png" 
              alt="Yura Yura STUDIO" 
              className="h-24 w-auto object-contain mx-auto lg:hidden"
            />
            <p className="text-sm text-muted-foreground lg:hidden px-4">
              小規模事業者向けWeb制作・集客支援サービス。千葉県を中心にプロジェクトを受注・発注。
            </p>
          </div>
        
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => {
              setActiveTab(v as "login" | "register");
              setRegistrationSuccess(false);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LogIn className="h-4 w-4 mr-2" />
                ログイン
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-2" />
                新規登録
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card className="border-none shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
                  <CardDescription>
                    アカウントにログインしてプロジェクト管理を開始しましょう
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loginMutation.isError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>エラー</AlertTitle>
                      <AlertDescription>
                        {loginMutation.error.message || "ログインに失敗しました。ユーザー名とパスワードを確認してください。"}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ユーザー名</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <User className="h-4 w-4" />
                                </span>
                                <Input 
                                  {...field} 
                                  className="pl-10"
                                  placeholder="ユーザー名を入力"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>パスワード</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">
                                  <Key className="h-4 w-4" />
                                </span>
                                <Input 
                                  type="password" 
                                  {...field} 
                                  className="pl-10"
                                  placeholder="パスワードを入力"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ログイン中...
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            ログイン
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">
                    アカウントをお持ちでない場合は「新規登録」タブから登録申請を行ってください。
                  </p>
                  
                  {/* ユーザーチュートリアル */}
                  <div className="rounded-md border p-4 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-medium">はじめての方へ：使い方ガイド</h3>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="overview">
                        <AccordionTrigger className="text-sm py-2">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-muted-foreground" />
                            <span>Yura Yura STUDIOとは？</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs leading-relaxed">
                          <p className="mb-2">
                            Yura Yura STUDIOは、千葉県を中心とした小規模事業者向けのWeb制作・集客支援プラットフォームです。
                            地域のクリエイターと事業者をつなぎ、地域活性化に貢献します。
                          </p>
                          <div className="flex items-center gap-2 text-primary mt-3">
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">誰でも簡単にプロジェクト管理ができます</span>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="features">
                        <AccordionTrigger className="text-sm py-2">
                          <div className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span>主な機能</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 text-xs">
                            <li className="flex items-start gap-2">
                              <Users className="h-3.5 w-3.5 text-primary mt-0.5" />
                              <span>チーム管理：プロジェクトごとにチームを編成し、効率的に協業</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Calendar className="h-3.5 w-3.5 text-primary mt-0.5" />
                              <span>スケジュール管理：期限設定と進捗管理で遅延を防止</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-primary mt-0.5" />
                              <span>拡張ポートフォリオ：URL共有とファイルアップロードに対応した実績管理</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <BarChart className="h-3.5 w-3.5 text-primary mt-0.5" />
                              <span>報酬配分：貢献度に応じた公平な報酬分配システム</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5" />
                              <span>コミュニケーション：メッセージとタイムラインで情報共有</span>
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="firstSteps">
                        <AccordionTrigger className="text-sm py-2">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span>はじめてのステップ</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs space-y-2">
                          <div className="bg-background p-2 rounded-md border mb-1">
                            <p className="font-medium">1. ログイン後のダッシュボード</p>
                            <p className="text-muted-foreground">最新のプロジェクト、通知、タスクが一目でわかります</p>
                          </div>
                          <div className="bg-background p-2 rounded-md border mb-1">
                            <p className="font-medium">2. プロジェクト参加</p>
                            <p className="text-muted-foreground">招待されたプロジェクトに参加するか、新しいプロジェクトを作成</p>
                          </div>
                          <div className="bg-background p-2 rounded-md border">
                            <p className="font-medium">3. スキル登録</p>
                            <p className="text-muted-foreground">あなたのスキルを登録して、最適なプロジェクトマッチングを</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="mt-2 text-xs text-muted-foreground">
                      詳細な使い方は、ログイン後のヘルプページでご確認いただけます。
                    </div>
                  </div>
                  
                  {/* 運営情報、プライバシーポリシー、利用規約 */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="company">
                        <AccordionTrigger className="text-xs py-1.5">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>運営会社</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs">
                          <p className="mb-2">Yura Yura STUDIOは、Harmonic Society株式会社が運営しています。</p>
                          <p className="mb-2">
                            弊社は千葉県を拠点とし、地域のクリエイターと事業者の協業を促進することで地域経済の活性化に貢献することを目指しています。
                          </p>
                          <a 
                            href="https://harmonic-society.co.jp/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>詳細はこちら</span>
                            <ArrowRight className="h-3 w-3" />
                          </a>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="privacy">
                        <AccordionTrigger className="text-xs py-1.5">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <span>プライバシーポリシー</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs">
                          <p className="mb-2">Yura Yura STUDIOは、ユーザーの個人情報保護を最優先事項と考えています。</p>
                          <ul className="list-disc pl-5 space-y-1 mb-2">
                            <li>収集した個人情報は、サービス提供の目的以外には使用しません</li>
                            <li>適切なセキュリティ対策を講じ、個人情報の漏洩を防止します</li>
                            <li>法令に基づく場合を除き、第三者への個人情報の提供は行いません</li>
                            <li>ユーザーからの個人情報の訂正・削除のリクエストに対応します</li>
                          </ul>
                          <p className="text-muted-foreground">詳細なプライバシーポリシーは、ログイン後のヘルプページでご確認いただけます。</p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="terms">
                        <AccordionTrigger className="text-xs py-1.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span>サイト利用規約</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs">
                          <p className="mb-2">Yura Yura STUDIOをご利用いただくにあたり、以下の利用規約に同意いただく必要があります。</p>
                          <ul className="list-disc pl-5 space-y-1 mb-2">
                            <li>本サービスの不正利用、違法行為、他のユーザーへの迷惑行為は禁止されています</li>
                            <li>投稿されたコンテンツの著作権は投稿者に帰属しますが、サービス内での表示・編集権限を当社に許諾するものとします</li>
                            <li>サービスの安定運用のため、事前の告知なくメンテナンスを実施する場合があります</li>
                            <li>利用規約に違反した場合、アカウントの停止または削除の措置を取る場合があります</li>
                          </ul>
                          <p className="text-muted-foreground">詳細な利用規約は、ログイン後のヘルプページでご確認いただけます。</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="mt-4 pt-3 text-center text-xs text-muted-foreground border-t border-border/30">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Lock className="h-3 w-3" />
                        <span>安全なサイト接続</span>
                      </div>
                      © {new Date().getFullYear()} Harmonic Society Inc. All rights reserved.
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              {registrationSuccess ? (
                <Card className="border-none shadow-lg">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-green-600">登録申請を受け付けました</CardTitle>
                    <CardDescription>
                      管理者の承認をお待ちください
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <div className="rounded-full bg-green-100 p-4 mb-4">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <p className="text-center mb-6">
                      登録リクエストを送信しました。管理者がリクエストを承認すると、システムにログインできるようになります。
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("login")}
                      className="w-full"
                    >
                      ログイン画面に戻る
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-lg">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">クリエイターとして参加する</CardTitle>
                    <CardDescription className="space-y-2">
                      <p>地域に根ざしたプロジェクトであなたのスキルを活かしましょう。</p>
                      <div className="bg-muted/30 p-3 rounded-md border border-border/50 mt-2">
                        <p className="text-xs font-medium text-primary">✨ 新規登録の特典</p>
                        <ul className="text-xs mt-1 space-y-0.5 list-disc list-inside">
                          <li>URL・ファイル添付対応の高機能ポートフォリオ</li>
                          <li>地域企業とのマッチング機会</li>
                          <li>スキルレベルに応じた公平な報酬システム</li>
                          <li>作品の効果的な表示とプレビュー機能</li>
                        </ul>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form
                        onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ユーザー名</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                                      <User className="h-4 w-4" />
                                    </span>
                                    <Input 
                                      {...field} 
                                      className="pl-10"
                                      placeholder="ユーザー名を入力"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>パスワード</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                                      <Key className="h-4 w-4" />
                                    </span>
                                    <Input 
                                      type="password" 
                                      {...field} 
                                      className="pl-10"
                                      placeholder="パスワードを入力"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>氏名</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                  </span>
                                  <Input 
                                    {...field} 
                                    className="pl-10"
                                    placeholder="氏名を入力"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>メールアドレス</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                  </span>
                                  <Input 
                                    type="email" 
                                    {...field} 
                                    className="pl-10"
                                    placeholder="メールアドレスを入力"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>役割</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-2.5 text-muted-foreground z-10">
                                    <Briefcase className="h-4 w-4" />
                                  </span>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="pl-10">
                                        <SelectValue placeholder="役割を選択" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {registrationRoles.map((role) => (
                                        <SelectItem key={role} value={role} className="flex flex-col items-start py-3">
                                          <span className="font-medium">{roleLabels[role]}</span>
                                          <span className="text-xs text-muted-foreground mt-1">{roleDescriptions[role]}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="mt-6 space-y-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary to-primary/80 rounded-md blur-md opacity-70 animate-pulse group-hover:opacity-100 transition-opacity"></div>
                            <Button
                              type="submit"
                              className="w-full relative bg-primary hover:bg-primary/90 text-white hover:text-white py-6 transition-all duration-300 shadow-lg hover:shadow-xl group"
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending ? (
                                <div className="flex items-center justify-center">
                                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                  <span className="text-base font-medium">送信中...</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <UserPlus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                  <span className="text-base font-medium">参加申請を送信する</span>
                                </div>
                              )}
                            </Button>
                          </div>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            申請後、管理者の承認を経てアカウントが有効になります。<br />
                            通常1〜2営業日以内に承認のお知らせメールが届きます。
                          </p>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}