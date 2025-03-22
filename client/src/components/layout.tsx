import { Link, useLocation } from "wouter";
import { useState } from "react";
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
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin, logoutMutation } = useAuth();

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
                "w-full justify-start px-4 py-3 text-base rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              {item.name}
            </Button>
          </Link>
        );
      })}
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

  return (
    <div className="min-h-screen bg-background">
      {/* モバイルヘッダー */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border z-50 flex items-center px-4">
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
            "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* デスクトップヘッダー */}
          <div className="hidden lg:flex h-16 items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Yura Yura STUDIO
            </h1>
          </div>
          {/* モバイルメニュー用の余白 */}
          <div className="lg:hidden h-16" />
          {/* ナビゲーションリンク */}
          <div className="p-4 overflow-y-auto">
            <NavLinks />
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-hidden">
          <main className="overflow-y-auto p-4 md:p-8 h-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}