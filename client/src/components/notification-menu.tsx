import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Link, useLocation } from "wouter";

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const { notifications = [], unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // 通知をクリックしたときの処理
  const handleNotificationClick = (id: number, link: string | null) => {
    markAsRead.mutate(id);
    setOpen(false);
    
    // リンクがある場合は遷移
    if (link) {
      try {
        // 外部リンクかどうかチェック
        const url = new URL(link, window.location.origin);
        const isSameOrigin = url.origin === window.location.origin;
        
        if (isSameOrigin) {
          // 内部リンクの場合はwouterのナビゲーションを使用してセッションを維持
          let path = url.pathname;
          
          // クエリパラメータがあれば追加
          if (url.search) {
            path += url.search;
          }
          
          // ハッシュがあれば、別途処理（wouterはハッシュを扱えないため）
          if (url.hash) {
            // useLocation でパスを変更した後、setTimeout でハッシュ部分にスクロール
            setLocation(path);
            setTimeout(() => {
              const hashElement = document.querySelector(url.hash);
              if (hashElement) {
                hashElement.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          } else {
            // ハッシュがない場合は単純に遷移
            setLocation(path);
          }
        } else {
          // 外部リンクの場合は直接開く
          window.open(link, '_blank');
        }
      } catch (e) {
        // URLパースエラーが発生した場合、相対パスと仮定して処理
        console.error("URL解析エラー:", e);
        
        // "#"を含むかどうかで分岐
        if (link.includes('#')) {
          const [path, hash] = link.split('#');
          setLocation(path);
          setTimeout(() => {
            const hashElement = document.querySelector(`#${hash}`);
            if (hashElement) {
              hashElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          setLocation(link);
        }
      }
    }
  };

  // すべて既読にする
  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead.mutate();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>通知</span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <Check className="mr-1 h-4 w-4" />
              すべて既読
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            通知はありません
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <DropdownMenuGroup>
              {notifications.map((notification: Notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`flex flex-col items-start p-3 ${!notification.read ? 'bg-muted/50' : ''}`}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                >
                  <div className="mb-1 font-medium">{notification.title}</div>
                  <div className="text-xs text-muted-foreground">{notification.message}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { 
                      addSuffix: true,
                      locale: ja 
                    })}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}