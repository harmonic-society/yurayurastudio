import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TimelinePost {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

export default function Timeline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState('');
  const [charCount, setCharCount] = useState(0);

  // Fetch timeline posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ['/api/timeline'],
    queryFn: () => apiRequest('/api/timeline'),
  });

  // Create a new post
  const createPostMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest('/api/timeline', {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timeline'] });
      setPostContent('');
      setCharCount(0);
      toast({
        title: '投稿しました',
        description: 'タイムラインに投稿しました',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '投稿に失敗しました',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a post
  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => 
      apiRequest(`/api/timeline/${postId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timeline'] });
      toast({
        title: '削除しました',
        description: '投稿を削除しました',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '削除に失敗しました',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const content = e.target.value;
    // Limit to 140 characters
    if (content.length <= 140) {
      setPostContent(content);
      setCharCount(content.length);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (postContent.trim() && postContent.length <= 140) {
      createPostMutation.mutate(postContent);
    }
  };

  const handleDelete = (postId: number) => {
    if (confirm('この投稿を削除しますか？')) {
      deletePostMutation.mutate(postId);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">タイムライン</h1>
      
      {/* Post creation form */}
      <Card className="mb-6">
        <CardHeader className="pb-0">
          <h2 className="text-lg font-medium">新規投稿</h2>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Input
                value={postContent}
                onChange={handleInputChange}
                placeholder="今何してる？（140文字まで）"
                className="w-full"
              />
              <div className="text-right text-sm text-muted-foreground">
                <span className={charCount > 130 ? "text-orange-500" : ""}>
                  {charCount}
                </span>/140
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              type="submit" 
              disabled={!postContent.trim() || createPostMutation.isPending}
            >
              投稿する
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Posts display */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-8">投稿がありません</div>
        ) : (
          posts?.map((post) => (
            <Card key={post.id} className="relative">
              {(user?.id === post.userId || user?.role === 'ADMIN') && (
                <button
                  onClick={() => handleDelete(post.id)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Delete post"
                >
                  <X size={16} />
                </button>
              )}
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <Avatar>
                    <AvatarImage 
                      src={post.user?.avatarUrl || undefined} 
                      alt={post.user?.name || "ユーザー"} 
                    />
                    <AvatarFallback>
                      {post.user ? getInitials(post.user.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-medium mr-2">{post.user?.name || "不明なユーザー"}</span>
                      <span className="text-muted-foreground text-sm">@{post.user?.username}</span>
                    </div>
                    <p className="mb-2">{post.content}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ja })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}