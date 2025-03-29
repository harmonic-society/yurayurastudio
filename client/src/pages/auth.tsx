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
      <div className="relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <h1 className="text-3xl font-bold tracking-tight">Yura Yura STUDIO</h1>
        </div>
        <div className="relative z-20 mt-10">
          <div className="bg-white/10 rounded-lg p-3 mb-8 backdrop-blur-sm border border-white/20 w-1/2 mx-auto">
            <img 
              src="/app-icon.svg" 
              alt="Yura Yura Studio Icon" 
              className="w-full rounded-md shadow-md mb-2" 
            />
          </div>
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              Yura Yura STUDIOは、小規模事業者向けWeb制作・集客支援サービスです。千葉県を中心にプロジェクトを受注・発注。地域貢献したいクリエイターの方、新規ユーザー登録で一緒に地域を盛り上げませんか？
            </p>
            <footer className="text-sm opacity-80 mt-4">
              プロジェクト管理の新しいスタンダード
            </footer>
          </blockquote>
        </div>
      </div>
      
      {/* ログイン/登録フォームパネル */}
      <div className="p-4 lg:p-8 flex items-center justify-center bg-background">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight lg:hidden">Yura Yura STUDIO</h1>
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
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">新規登録申請</CardTitle>
                    <CardDescription>
                      アカウントの作成を申請します。管理者の承認後にログインできます。
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
                        
                        <Button
                          type="submit"
                          className="w-full mt-6"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              送信中...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              登録を申請
                            </>
                          )}
                        </Button>
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