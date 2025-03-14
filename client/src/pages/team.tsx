import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type User } from "@shared/schema";
import { Users } from "lucide-react";

const roleLabels = {
  DIRECTOR: "ディレクター",
  SALES: "営業担当",
  CREATOR: "クリエイター"
} as const;

export default function Team() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">チームメンバー</h1>
        <p className="text-muted-foreground">
          プロジェクトに携わるメンバー一覧
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {roleLabels[user.role as keyof typeof roleLabels]}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                <span className="text-muted-foreground">メール：</span>
                {user.email}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
