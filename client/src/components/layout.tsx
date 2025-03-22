import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FolderKanban,
  Users,
  Settings,
  Menu,
  X,
  Image,
  LogOut,
  UserCog,
  UserPlus,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, logoutMutation } = useAuth();
  const [mounted, setMounted] = useState(false);

  // コンポーネントがマウントされた後に表示を有効にする（SSRとCSRの不一致を防ぐため）
  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    { name: "ダッシュボード", href: "/", icon: LayoutDashboard },
    { name: "プロジェクト", href: "/projects", icon: FolderKanban },
    { name: "ポートフォリオ", href: "/portfolios", icon: Image },
    { name: "チーム", href: "/team", icon: Users },
    { name: "設定", href: "/settings", icon: Settings },
    // 管理者の場合のみ表示
    ...(isAdmin ? [
      { name: "ユーザー管理", href: "/admin/users", icon: UserCog },
      { name: "登録リクエスト", href: "/admin/registration-requests", icon: UserPlus }
    ] : []),
  ];

  const NavLinks = () => (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start px-4 py-3 text-base rounded-md transition-all",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className={cn("h-5 w-5 mr-3 flex-shrink-0", isActive ? "animate-pulse" : "")} />
              {item.name}
            </Button>
          </Link>
        );
      })}
      <Separator className="my-4" />
      {/* ログアウトボタン */}
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-3 text-base rounded-md transition-colors text-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => logoutMutation.mutate()}
      >
        <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
        ログアウト
      </Button>
    </nav>
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* モバイルヘッダー */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-foreground"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
          <h1 className="ml-4 text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Yura Yura STUDIO
          </h1>
        </div>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem>設定</DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex h-screen pt-16 lg:pt-0">
        {/* オーバーレイ */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm lg:hidden z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* サイドバー */}
        <div
          className={cn(
            "fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 w-64 bg-background border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 h-screen overflow-y-auto",
            isMobileMenuOpen ? "translate-x-0 shadow-lg" : "-translate-x-full"
          )}
        >
          {/* デスクトップヘッダー */}
          <div className="hidden lg:flex h-16 items-center px-6 border-b border-border bg-gradient-to-r from-background to-background/95">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Yura Yura STUDIO
            </h1>
          </div>
          
          {/* モバイルメニュー用の余白 */}
          <div className="lg:hidden h-16" />
          
          {/* ユーザー情報 */}
          {user && (
            <div className="p-4 flex items-center space-x-3 border-b border-border">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                <AvatarFallback className="bg-primary/10 text-primary">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
            </div>
          )}
          
          {/* ナビゲーションリンク */}
          <div className="p-4 overflow-y-auto">
            <NavLinks />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden">
          {/* デスクトップ用ヘッダー */}
          <div className="h-16 border-b border-border hidden lg:flex items-center justify-end px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>設定</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ログアウト</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <main className="overflow-y-auto p-4 md:p-8 h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}