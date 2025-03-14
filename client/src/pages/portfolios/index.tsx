import { useQuery } from "@tanstack/react-query";
import { type Portfolio, type User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function Portfolios() {
  const { data: portfolios, isLoading: isLoadingPortfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"]
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  if (isLoadingPortfolios) {
    return <div>読み込み中...</div>;
  }

  const getUserName = (userId: number) => {
    return users?.find(u => u.id === userId)?.name || "不明なユーザー";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ポートフォリオ</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          全プロジェクトの成果物一覧
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios?.map((portfolio) => (
          <Card key={portfolio.id}>
            <div className="relative aspect-video">
              <img
                src={portfolio.imageUrl}
                alt={`成果物 ${portfolio.id}`}
                className="object-cover w-full h-full rounded-t-lg"
              />
            </div>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  担当: {getUserName(portfolio.userId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  作成日: {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!portfolios || portfolios.length === 0) && (
          <p className="text-center text-muted-foreground col-span-full">
            まだ成果物が登録されていません
          </p>
        )}
      </div>
    </div>
  );
}
