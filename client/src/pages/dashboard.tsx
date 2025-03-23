import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectStatus, type Project } from "@shared/schema";
import { Link } from "wouter";
import { format, isBefore, addDays } from "date-fns";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlusCircle,
  ArrowRight,
  CalendarRange,
  AlertTriangle,
  Loader2,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import UserRewardInfo from "@/components/user-reward-info";
import { useAuth } from "@/hooks/use-auth";

// スタイルと設定
const STATUS_CONFIG = {
  NOT_STARTED: {
    color: "#9ca3af", // gray-400
    icon: Clock,
    label: "未着手",
    bgClass: "bg-gray-100"
  },
  IN_PROGRESS: {
    color: "#3b82f6", // blue-500
    icon: Loader2, 
    label: "進行中",
    bgClass: "bg-blue-100"
  },
  COMPLETED: {
    color: "#10b981", // green-500
    icon: CheckCircle2,
    label: "完了",
    bgClass: "bg-green-100"
  },
  ON_HOLD: {
    color: "#f59e0b", // amber-500
    icon: PauseCircle,
    label: "保留中",
    bgClass: "bg-amber-100"
  }
};



export default function Dashboard() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  // 統計データの計算
  const calculateStats = () => {
    if (!projects) return { 
      statusCounts: {} as Record<ProjectStatus, number>, 
      upcomingDeadlines: [] as Project[], 
      pieData: [] as Array<{name: string, value: number, color: string}>, 
      totalReward: 0 
    };
    
    const statusCounts = projects.reduce<Record<ProjectStatus, number>>((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {
      "NOT_STARTED": 0,
      "IN_PROGRESS": 0,
      "COMPLETED": 0,
      "ON_HOLD": 0
    });
    
    // 期限が近いプロジェクト（7日以内）
    const today = new Date();
    const oneWeekLater = addDays(today, 7);
    const upcomingDeadlines = projects
      .filter(project => 
        project.status !== "COMPLETED" && 
        isBefore(new Date(project.dueDate), oneWeekLater)
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
    
    // 円グラフ用データ
    const pieData = Object.entries(statusCounts).map(([status, value]) => ({
      name: STATUS_CONFIG[status as ProjectStatus].label,
      value,
      color: STATUS_CONFIG[status as ProjectStatus].color
    }));
    
    // 総報酬額
    const totalReward = projects.reduce((sum, project) => sum + project.totalReward, 0);
    
    return { statusCounts, upcomingDeadlines, pieData, totalReward };
  };
  
  const { statusCounts, upcomingDeadlines, pieData, totalReward } = calculateStats();

  // 日付に基づいて期限切れか近いかを判断
  const getDueDateStatus = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const today = new Date();
    
    if (isBefore(date, today)) {
      return { color: "text-red-500", label: "期限切れ", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> };
    } else {
      const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        color: "text-amber-500", 
        label: `あと${daysLeft}日`, 
        icon: <CalendarRange className="h-4 w-4 text-amber-500" /> 
      };
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-10 w-[250px] mb-2" />
          <Skeleton className="h-5 w-[350px]" />
        </div>
        
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-md" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!projects) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          全てのプロジェクトの概要と進捗状況を確認できます
        </p>
      </div>

      {/* ステータスカード */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-primary/10 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">
              プロジェクト総数
            </CardTitle>
            <div className="p-1.5 rounded-full bg-primary/10">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-primary/90">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              合計報酬額: ¥{totalReward.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200 shadow-sm transition-all duration-200 hover:shadow-blue-100/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-600">
              進行中
            </CardTitle>
            <div className="p-1.5 rounded-full bg-blue-100">
              <STATUS_CONFIG.IN_PROGRESS.icon className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {statusCounts["IN_PROGRESS"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              全体の{Math.round(((statusCounts["IN_PROGRESS"] || 0) / (projects.length || 1)) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm transition-all duration-200 hover:shadow-green-100/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-600">
              完了
            </CardTitle>
            <div className="p-1.5 rounded-full bg-green-100">
              <STATUS_CONFIG.COMPLETED.icon className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {statusCounts["COMPLETED"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              全体の{Math.round(((statusCounts["COMPLETED"] || 0) / (projects.length || 1)) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 shadow-sm transition-all duration-200 hover:shadow-amber-100/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-600">
              保留中
            </CardTitle>
            <div className="p-1.5 rounded-full bg-amber-100">
              <STATUS_CONFIG.ON_HOLD.icon className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-amber-600">
              {statusCounts["ON_HOLD"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              全体の{Math.round(((statusCounts["ON_HOLD"] || 0) / (projects.length || 1)) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* グラフとリスト */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 円グラフ */}
        <Card className="bg-white border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">プロジェクト状況の分布</CardTitle>
              <div className="p-1.5 rounded-full bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardDescription>各状態のプロジェクト数の割合</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke={entry.color}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    layout="horizontal"
                    formatter={(value) => (
                      <span className="text-sm">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 期限が近いプロジェクト */}
        <Card className="bg-white border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">期限が近いプロジェクト</CardTitle>
              <div className="p-1.5 rounded-full bg-primary/10">
                <CalendarRange className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardDescription>直近の納期が設定されたプロジェクト</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeadlines.map((project) => {
                  const { color, label, icon } = getDueDateStatus(project.dueDate);
                  return (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="rounded-lg border p-3 transition-all hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{project.name}</div>
                          <Badge 
                            className={cn(
                              "border",
                              project.status === "IN_PROGRESS" ? "bg-blue-200 text-blue-700" : 
                              project.status === "COMPLETED" ? "bg-green-200 text-green-700" :
                              project.status === "ON_HOLD" ? "bg-amber-200 text-amber-700" :
                              "bg-slate-200 text-slate-700"
                            )}
                          >
                            {STATUS_CONFIG[project.status].label}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                          <div className="flex items-center gap-1 mr-3">
                            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{format(new Date(project.dueDate), "yyyy年M月d日")}</span>
                          </div>
                          <div className={cn("flex items-center gap-1", color)}>
                            {icon}
                            <span>{label}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="font-medium">直近の期限はありません</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  今週の期限が迫ったプロジェクトはありません
                </p>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <Link href="/projects">
                <Button variant="outline" size="sm" className="gap-1">
                  <span>すべてのプロジェクトを見る</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 報酬情報セクション */}
      <Card className="bg-white border-primary/10 shadow-sm transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">報酬情報</CardTitle>
            <div className="p-1.5 rounded-full bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </div>
          <CardDescription>プロジェクトの報酬と分配状況</CardDescription>
        </CardHeader>
        <CardContent>
          <UserRewardInfo />
        </CardContent>
      </Card>
      
      {/* アクションボタン */}
      <div className="flex justify-end">
        <Link href="/projects">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>新規プロジェクトを作成</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}