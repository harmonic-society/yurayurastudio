import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { insertCommentSchema, type Comment, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";

interface CommentSectionProps {
  projectId: number;
}

export default function CommentSection({ projectId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionListOpen, setMentionListOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  // ハッシュの変更を検知して、コメントセクションに自動スクロール
  useEffect(() => {
    if (window.location.hash === '#comments' && commentSectionRef.current) {
      commentSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const { data: comments } = useQuery<Comment[]>({
    queryKey: [`/api/projects/${projectId}/comments`]
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  const form = useForm({
    resolver: zodResolver(insertCommentSchema),
    defaultValues: {
      content: "",
      projectId,
      userId: user?.id || 0
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/projects/${projectId}/comments`, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/comments`] });
      form.reset();
      setCommentText("");
    }
  });

  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || "不明なユーザー";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);
    form.setValue("content", value);
    
    // カーソル位置を保存
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    // @マークの後の文字列を取得
    const textBeforeCursor = value.substring(0, cursorPos);
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atSignIndex !== -1 && (atSignIndex === 0 || /\s/.test(textBeforeCursor[atSignIndex - 1]))) {
      const searchText = textBeforeCursor.substring(atSignIndex + 1);
      if (!searchText.includes(' ')) {
        setMentionSearch(searchText);
        setMentionListOpen(true);
        return;
      }
    }
    
    setMentionListOpen(false);
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current) return;
    
    const text = commentText;
    const cursorPos = cursorPosition;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);
    
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    if (atSignIndex === -1) return;
    
    // @以降の部分を置き換え（usernameを使用）
    const newText = textBeforeCursor.substring(0, atSignIndex) + 
                    `@${user.username}` + 
                    (textAfterCursor.startsWith(' ') ? '' : ' ') + 
                    textAfterCursor;
    
    setCommentText(newText);
    form.setValue("content", newText);
    setMentionListOpen(false);
    
    // カーソルをユーザー名の後ろに移動
    const newCursorPos = atSignIndex + user.username.length + 1 + (textAfterCursor.startsWith(' ') ? 0 : 1);
    
    // フォーカスをテキストエリアに戻し、カーソル位置を設定
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  // マークアップされたコメント内容を返す
  const renderCommentWithMentions = (content: string) => {
    if (!users) return content;
    
    // @ユーザー名 のパターンを検出して、ハイライト表示
    const parts = [];
    let lastIndex = 0;
    const regex = /@([^\s@]+)/g; // ユーザー名（スペースなし）のマッチングに更新
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const userName = match[1];
      const mentionedUser = users.find(u => u.name === userName || u.username === userName);
      
      if (mentionedUser) {
        // マッチ前のテキスト
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        
        // メンション部分（実際のユーザー名を表示）
        parts.push(
          <span 
            key={`mention-${match.index}`} 
            className="text-primary font-medium"
            title={mentionedUser.name} // 本名をツールチップで表示
          >
            @{mentionedUser.username}
          </span>
        );
        
        lastIndex = match.index + match[0].length;
      }
    }
    
    // 残りのテキスト
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  const filteredUsers = users?.filter(u => {
    // まずusernameで検索し、次にnameで検索
    const usernameMatch = u.username.toLowerCase().includes(mentionSearch.toLowerCase());
    const nameMatch = u.name.toLowerCase().includes(mentionSearch.toLowerCase());
    return usernameMatch || nameMatch;
  }).sort((a, b) => {
    // usernameが一致するものを優先的に上位表示
    const aUsernameMatch = a.username.toLowerCase().includes(mentionSearch.toLowerCase());
    const bUsernameMatch = b.username.toLowerCase().includes(mentionSearch.toLowerCase());
    if (aUsernameMatch && !bUsernameMatch) return -1;
    if (!aUsernameMatch && bUsernameMatch) return 1;
    return 0;
  }) || [];

  return (
    <div className="space-y-4" id="comments" ref={commentSectionRef}>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Textarea 
                      placeholder="コメントを追加... @username でメンション" 
                      {...field}
                      ref={textareaRef}
                      className="min-h-[100px]"
                      value={commentText}
                      onChange={handleTextChange}
                    />
                    
                    {mentionListOpen && filteredUsers.length > 0 && (
                      <div className="absolute z-10 w-64 bg-card shadow-lg rounded-md border border-border mt-1">
                        <div className="p-2 text-sm font-medium border-b">
                          ユーザーを選択
                        </div>
                        <div className="max-h-60 overflow-auto">
                          {filteredUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted flex flex-col"
                              onClick={() => insertMention(user)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">@{user.username}</span>
                                <span className="text-xs text-muted-foreground">({user.role})</span>
                              </div>
                              <span className="text-xs text-muted-foreground truncate">{user.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <Button 
            type="submit"
            disabled={mutation.isPending || !commentText.trim()}
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? "投稿中..." : "コメントを投稿"}
          </Button>
        </form>
      </Form>

      <div className="space-y-4">
        {comments?.map((comment) => (
          <div 
            key={comment.id}
            className="bg-card p-4 rounded-lg space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-muted-foreground gap-1">
              <span>{getUserName(comment.userId)}</span>
              <span>
                {format(new Date(comment.createdAt), "yyyy年M月d日 H:mm")}
              </span>
            </div>
            <p className="whitespace-pre-line break-words">
              {renderCommentWithMentions(comment.content)}
            </p>
          </div>
        ))}
        {(!comments || comments.length === 0) && (
          <p className="text-center text-muted-foreground">
            まだコメントはありません
          </p>
        )}
      </div>
    </div>
  );
}