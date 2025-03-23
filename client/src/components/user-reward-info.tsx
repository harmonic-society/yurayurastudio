import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip
} from "recharts";

// 報酬情報の型
interface UserReward {
  projectId: number;
  projectName: string;
  totalReward: number;
  percentage: number;
  amount: number;
}

// 円グラフ用の色
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B6B"];

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

  // 総報酬額を計算
  const totalAmount = rewards?.reduce((total, reward) => total + reward.amount, 0) || 0;
  
  // プロジェクト別の報酬割合データ（円グラフ用）
  const pieData = rewards?.map((reward) => ({
    name: reward.projectName,
    value: reward.amount
  })) || [];

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
        
        {rewards && rewards.length > 0 && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="space-y-4">
          <p className="font-semibold">プロジェクト別報酬</p>
          {rewards && rewards.length > 0 ? (
            rewards.map((reward) => (
              <div key={reward.projectId} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p>{reward.projectName}</p>
                  <p className="font-medium">¥{(reward.amount || 0).toLocaleString()}</p>
                </div>
                <Progress value={reward.percentage || 0} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  報酬総額の{reward.percentage || 0}%（プロジェクト総額 ¥{(reward.totalReward || 0).toLocaleString()}）
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">報酬情報がありません</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}