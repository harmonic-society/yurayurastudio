import { useQuery } from "@tanstack/react-query";
import { type Portfolio, type User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
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
                alt={`成果物 ${portfolio.title}`}
                className="object-cover w-full h-full rounded-t-lg"
              />
            </div>
            <CardContent className="pt-4">
              <h3 className="font-medium">{portfolio.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {portfolio.description}
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-sm text-muted-foreground">
                  担当: {getUserName(portfolio.userId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  作成日: {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
                </p>
                <a
                  href={portfolio.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  成果物を見る
                </a>
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