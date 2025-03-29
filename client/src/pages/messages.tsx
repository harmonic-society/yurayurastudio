import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  SendIcon, 
  RefreshCw, 
  ChevronLeft, 
  Search, 
  Users, 
  UserPlus, 
  MessageCircle,
  X
} from "lucide-react";
import type { User, DirectMessage } from "@shared/schema";
import Layout from "@/components/layout";
import { format } from "date-fns";

// シンプルなモバイルかどうかの判定
function useMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return isMobile;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useMobile();
  const urlParams = new URLSearchParams(window.location.search);
  const selectedUserId = urlParams.get("userId") ? Number(urlParams.get("userId")) : null;
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);

  // ユーザー一覧の取得
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // 会話一覧の取得（最新のメッセージだけを表示するため）
  const { data: conversations, isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // 選択されたユーザーとの会話の取得
  const { data: selectedConversation, isLoading: isLoadingSelectedConversation, refetch: refetchSelectedConversation } = useQuery({
    queryKey: ["/api/messages/conversation", selectedUserId],
    enabled: !!user && !!selectedUserId,
  });

  // メッセージの送信
  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: (data: { toUserId: number; message: string }) => 
      apiRequest("/api/messages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", selectedUserId] });
      toast({
        title: "メッセージを送信しました",
        description: "メッセージが正常に送信されました。",
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました。",
        variant: "destructive",
      });
      console.error("メッセージ送信エラー:", error);
    },
  });

  // メッセージを既読にする
  const { mutate: markAsRead } = useMutation({
    mutationFn: (messageId: number) => 
      apiRequest(`/api/messages/${messageId}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  // 選択されたユーザーの設定
  useEffect(() => {
    if (selectedUserId && users && Array.isArray(users)) {
      const selectedUser = users.find((u: User) => u.id === selectedUserId);
      if (selectedUser) {
        setSelectedUser(selectedUser);
      }
    }
  }, [selectedUserId, users]);

  // 会話が読み込まれたら未読メッセージを既読に
  useEffect(() => {
    if (selectedConversation && Array.isArray(selectedConversation)) {
      selectedConversation.forEach((msg: DirectMessage) => {
        if (msg.toUserId === user?.id && !msg.read) {
          markAsRead(msg.id);
        }
      });
    }
  }, [selectedConversation, user?.id, markAsRead]);

  // 定期的に会話を更新
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedUserId) {
        refetchSelectedConversation();
      }
      refetchConversations();
    }, 10000); // 10秒ごとに更新
    
    return () => clearInterval(interval);
  }, [selectedUserId, refetchSelectedConversation, refetchConversations]);

  // 会話ごとに最新のメッセージとユーザー情報をグループ化
  const conversationGroups: Record<number, { user: User; latestMessage: DirectMessage }> = {};
  
  if (conversations && Array.isArray(conversations) && users && Array.isArray(users)) {
    conversations.forEach((msg: DirectMessage) => {
      const otherUserId = msg.fromUserId === user?.id ? msg.toUserId : msg.fromUserId;
      const otherUser = users.find((u: User) => u.id === otherUserId);
      
      if (otherUser) {
        if (!conversationGroups[otherUserId] || 
            new Date(msg.createdAt) > new Date(conversationGroups[otherUserId].latestMessage.createdAt)) {
          conversationGroups[otherUserId] = {
            user: otherUser,
            latestMessage: msg,
          };
        }
      }
    });
  }

  // メッセージの送信処理
  const handleSendMessage = () => {
    if (!message.trim() || !selectedUserId) return;
    
    sendMessage({
      toUserId: selectedUserId,
      message: message.trim(),
    });
  };

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return `今日 ${format(date, 'HH:mm')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨日 ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'yyyy/MM/dd HH:mm');
    }
  };

  // ユーザー選択を解除してリストに戻る（モバイル用）
  const handleBackToList = () => {
    navigate("/messages");
    setSelectedUser(null);
  };

  // ユーザー検索（名前、ユーザー名、ロールでリアルタイム検索）およびソート
  const filteredUsers = users && Array.isArray(users) 
    ? users.filter((u: User) => 
        u.id !== user?.id && 
        (searchQuery === "" || 
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
      .sort((a, b) => {
        // 名前順でソート
        return a.name.localeCompare(b.name);
      })
    : [];
    
  // ユーザーをロール別にグループ化（検索結果をより見やすく）
  const groupedUsers = filteredUsers.reduce<Record<string, User[]>>((groups, user) => {
    const role = user.role || 'OTHER';
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(user);
    return groups;
  }, {});
  
  // ロールの表示順序を定義
  const roleOrder = ['ADMIN', 'DIRECTOR', 'SALES', 'CREATOR', 'OTHER'];

  return (
    <Layout>
      <div className="container py-6 max-w-6xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">メッセージ</CardTitle>
            <CardDescription>
              チームメンバーとのダイレクトメッセージ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[70vh] md:h-[60vh] overflow-hidden">
              {/* ユーザーリスト（モバイルでは選択時に非表示） */}
              {(!isMobile || !selectedUser) && (
                <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r'} pr-4`}>
                  {/* 検索および新規メッセージ機能 */}
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="ユーザー名やロールを検索..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (e.target.value.trim() !== "" && !isUserListOpen) {
                              setIsUserListOpen(true);
                            }
                          }}
                          className="pl-8 flex-1 pr-8"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setSearchQuery("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsUserListOpen(!isUserListOpen)}
                        className="flex-shrink-0"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 既存の会話一覧 */}
                  {!isUserListOpen ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 px-2 rounded"
                           onClick={() => setIsUserListOpen(true)}>
                        <h3 className="font-medium flex items-center">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          既存の会話
                        </h3>
                        <ChevronLeft className="h-4 w-4 transition-transform rotate-90" />
                      </div>

                      <ScrollArea className="h-[calc(70vh-18rem)]">
                        <div className="space-y-2 pr-4 pt-2">
                          {Object.values(conversationGroups).length > 0 ? (
                            Object.values(conversationGroups)
                              .sort((a, b) => 
                                new Date(b.latestMessage.createdAt).getTime() - 
                                new Date(a.latestMessage.createdAt).getTime()
                              )
                              .map(({ user: otherUser, latestMessage }) => (
                                <div 
                                  key={otherUser.id}
                                  onClick={() => {
                                    navigate(`/messages?userId=${otherUser.id}`);
                                    setSelectedUser(otherUser);
                                  }}
                                  className={`flex items-center p-3 rounded-md cursor-pointer
                                    ${selectedUserId === otherUser.id ? 'bg-primary/10' : 'hover:bg-muted'}
                                    ${!latestMessage.read && latestMessage.toUserId === user?.id ? 'border-l-4 border-primary pl-2' : ''}
                                  `}
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={otherUser.avatarUrl ? `/uploads/${otherUser.avatarUrl}` : undefined} />
                                    <AvatarFallback>{otherUser.name.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="ml-3 flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                      <p className="font-medium">{otherUser.name}</p>
                                      <span className="text-xs text-muted-foreground">
                                        {typeof latestMessage.createdAt === 'string' && formatDate(latestMessage.createdAt)}
                                      </span>
                                    </div>
                                    <p className={`text-sm truncate ${!latestMessage.read && latestMessage.toUserId === user?.id ? 'font-medium' : 'text-muted-foreground'}`}>
                                      {latestMessage.fromUserId === user?.id ? '自分: ' : ''}
                                      {latestMessage.message}
                                    </p>
                                    {!latestMessage.read && latestMessage.toUserId === user?.id && (
                                      <Badge variant="default" className="mt-1">新着</Badge>
                                    )}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              メッセージはまだありません。
                              <div className="mt-4">
                                <p className="text-sm">他のユーザーにメッセージを送ってみましょう</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 px-2 rounded"
                           onClick={() => setIsUserListOpen(false)}>
                        <h3 className="font-medium flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          すべてのユーザー
                        </h3>
                        <ChevronLeft className="h-4 w-4 transition-transform -rotate-90" />
                      </div>

                      <ScrollArea className="h-[calc(70vh-18rem)]">
                        <div className="space-y-2 pr-4 pt-2">
                          {filteredUsers.length > 0 ? (
                            <>
                              {/* ロール別にグループ化して表示 */}
                              {roleOrder.map(role => {
                                const usersInRole = groupedUsers[role] || [];
                                if (usersInRole.length === 0) return null;
                                
                                return (
                                  <div key={role} className="mb-4">
                                    {/* ロールヘッダー */}
                                    <div className="flex items-center mb-2 border-b pb-1">
                                      <Badge 
                                        variant={
                                          role === 'ADMIN' ? 'destructive' : 
                                          role === 'DIRECTOR' ? 'default' : 
                                          role === 'SALES' ? 'outline' : 
                                          'secondary'
                                        }
                                        className="mr-2"
                                      >
                                        {role}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {usersInRole.length}人
                                      </span>
                                    </div>
                                    
                                    {/* ユーザーリスト */}
                                    <div className="space-y-1">
                                      {usersInRole.map(otherUser => (
                                        <div 
                                          key={otherUser.id}
                                          onClick={() => {
                                            navigate(`/messages?userId=${otherUser.id}`);
                                            setSelectedUser(otherUser);
                                            setIsUserListOpen(false);
                                          }}
                                          className="flex items-center p-3 rounded-md cursor-pointer hover:bg-muted"
                                        >
                                          <Avatar className="h-10 w-10">
                                            <AvatarImage src={otherUser.avatarUrl ? `/uploads/${otherUser.avatarUrl}` : undefined} />
                                            <AvatarFallback>{otherUser.name.slice(0, 2)}</AvatarFallback>
                                          </Avatar>
                                          <div className="ml-3 flex-1">
                                            <p className="font-medium">{otherUser.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              @{otherUser.username}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          ) : (
                            <div className="text-center text-muted-foreground py-8">
                              検索結果がありません
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
              
              {/* メッセージエリア */}
              {(!isMobile || selectedUser) && (
                <div className={`${isMobile ? 'w-full' : 'w-2/3'} pl-4 flex flex-col h-full`}>
                  {selectedUser ? (
                    <>
                      {/* ヘッダー */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {isMobile && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="mr-2"
                              onClick={handleBackToList}
                            >
                              <ChevronLeft />
                            </Button>
                          )}
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedUser.avatarUrl ? `/uploads/${selectedUser.avatarUrl}` : undefined} />
                            <AvatarFallback>{selectedUser.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <p className="font-medium">{selectedUser.name}</p>
                            <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                            <p className="text-xs text-muted-foreground">{selectedUser.role}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => refetchSelectedConversation()}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* メッセージ表示エリア */}
                      <ScrollArea className="flex-1 pr-4 mb-4">
                        {selectedConversation && Array.isArray(selectedConversation) && selectedConversation.length > 0 ? (
                          <div className="space-y-4">
                            {selectedConversation.map((msg: DirectMessage) => {
                              const isFromMe = msg.fromUserId === user?.id;
                              return (
                                <div 
                                  key={msg.id}
                                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div className={`max-w-[80%] ${isFromMe ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                    <p className={`text-xs mt-1 ${isFromMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {typeof msg.createdAt === 'string' && formatDate(msg.createdAt)}
                                      {isFromMe && msg.read && ' ✓'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <p className="mb-2">メッセージを送ってみましょう</p>
                              <p className="text-xs">
                                {selectedUser.name}さんとの会話が始まります
                              </p>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                      
                      {/* メッセージ入力エリア */}
                      <div className="pt-2">
                        <div className="flex items-end">
                          <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={`${selectedUser.name}さんにメッセージを送る...（送信ボタンを押してメッセージを送信）`}
                            className="resize-none flex-1 mr-2 min-h-[120px]"
                            rows={5}
                          />
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={!message.trim() || isSendingMessage}
                          >
                            <SendIcon className="h-4 w-4 mr-2" />
                            送信
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          送信ボタンを押してメッセージを送信します。Enterキーで自由に改行できます。
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <p className="mb-2">ユーザーを選択してメッセージを送りましょう</p>
                        <p className="text-xs">左のリストからユーザーを選んでください</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}