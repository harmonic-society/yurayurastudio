import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// 報酬情報の型
interface UserReward {
  projectId: number;
  projectName: string;
  totalReward: number;
  percentage: number;
  amount: number;
}

export default function UserRewardInfo() {
  const { user } = useAuth();
  
  const { data: rewards, isLoading, error } = useQuery<UserReward[]>({
    queryKey: [`/api/users/${user?.id}/rewards`],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error || !rewards) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>報酬情報</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">報酬情報の取得中にエラーが発生しました</p>
        </CardContent>
      </Card>
    );
  }

  // 報酬がない場合
  if (!rewards || rewards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>報酬情報</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">報酬情報がありません</p>
        </CardContent>
      </Card>
    );
  }

  // 総報酬額を計算 - amount プロパティが存在するもののみ合計
  const totalAmount = rewards?.reduce((total, reward) => {
    // 項目ごとの詳細をデバッグ出力
    console.log(`Project ${reward.projectId}: ${reward.projectName}, amount:`, reward.amount);
    return total + (reward.amount || 0);
  }, 0) || 0;
  
  // デバッグ情報をコンソールに出力
  console.log("Rewards data:", rewards);
  console.log("Calculated total amount:", totalAmount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>報酬情報</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</p>
          <p className="text-muted-foreground">総報酬額</p>
        </div>
        
        <div className="space-y-4">
          <p className="font-semibold">プロジェクト別報酬</p>
          {(() => {
            // amountプロパティがあり、かつ0より大きい値のものだけをフィルタリングして表示
            const filteredRewards = rewards.filter(reward => 
              reward.amount !== undefined && reward.amount !== null && reward.amount > 0
            );
            
            if (filteredRewards.length === 0) {
              return <p className="text-muted-foreground">報酬情報がありません</p>;
            }
            
            return filteredRewards.map((reward) => (
              <div key={reward.projectId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p>{reward.projectName}</p>
                  <p className="font-medium">¥{reward.amount.toLocaleString()}</p>
                </div>
                <Progress value={reward.percentage || 0} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  報酬総額の{reward.percentage || 0}%（プロジェクト総額 ¥{(reward.totalReward || 0).toLocaleString()}）
                </p>
              </div>
            ));
          })()}
        </div>
      </CardContent>
    </Card>
  );
}