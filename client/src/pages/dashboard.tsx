import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatus, type Project } from "@shared/schema";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend 
} from "recharts";

export default function Dashboard() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!projects) {
    return null;
  }

  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<ProjectStatus, number>);

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name === "NOT_STARTED" ? "未着手" :
         name === "IN_PROGRESS" ? "進行中" :
         name === "COMPLETED" ? "完了" :
         name === "ON_HOLD" ? "保留" : name,
    value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          全てのプロジェクトの概要と進捗状況
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              プロジェクト総数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              進行中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {statusCounts["IN_PROGRESS"] || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              完了
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {statusCounts["COMPLETED"] || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              保留中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {statusCounts["ON_HOLD"] || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>プロジェクト状況の分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}