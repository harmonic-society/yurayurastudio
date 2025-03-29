import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function MessageMenu() {
  const [_, navigate] = useLocation();
  
  // 未読メッセージ数の取得
  const { data, isLoading } = useQuery({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000, // 10秒ごとに更新
  });
  
  const unreadCount = data && typeof data === 'object' && 'count' in data ? (data.count as number) : 0;
  
  const handleClick = () => {
    navigate("/messages");
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-10 w-10 rounded-full p-0"
      onClick={handleClick}
    >
      <MessageCircle className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}