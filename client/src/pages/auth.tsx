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
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  User, 
  Key, 
  Briefcase, 
  AlertCircle,
  CheckCircle,
  Loader2
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
      role: undefined,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data) => {
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
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl leading-relaxed">
              Web制作と集客支援のためのプロジェクト管理システム。
              チームの効率的な案件管理と柔軟な人員配置を支援するWebアプリケーション。
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
              Web制作と集客支援のためのプロジェクト管理システム
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
                <CardFooter className="flex flex-col">
                  <p className="text-sm text-muted-foreground mt-2">
                    アカウントをお持ちでない場合は「新規登録」タブから登録申請を行ってください。
                  </p>
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