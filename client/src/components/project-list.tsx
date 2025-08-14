import { Link } from "wouter";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { format, isAfter, isBefore, addDays } from "date-fns";
import type { Project } from "@shared/schema";
import { Calendar, Clock, Users, User, DollarSign, Briefcase, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusVariants = {
  NOT_STARTED: {
    color: "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100 border-slate-300",
    icon: <Clock className="h-3.5 w-3.5 text-slate-600" />
  },
  IN_PROGRESS: {
    color: "bg-blue-200 text-blue-700 dark:bg-blue-600 dark:text-blue-100 border-blue-300",
    icon: <Clock className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
  },
  COMPLETED: {
    color: "bg-green-200 text-green-700 dark:bg-green-600 dark:text-green-100 border-green-300",
    icon: <Clock className="h-3.5 w-3.5 text-green-600" />
  },
  ON_HOLD: {
    color: "bg-amber-200 text-amber-700 dark:bg-amber-600 dark:text-amber-100 border-amber-300",
    icon: <Clock className="h-3.5 w-3.5 text-amber-600" />
  }
} as const;

const statusLabels = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留"
} as const;

interface ProjectListProps {
  projects: Project[];
}

export default function ProjectList({ projects }: ProjectListProps) {
  // 日付に基づいて状態を判断する (期日が近づいているか)
  const getDueDateStatus = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const nearDueDate = addDays(today, 7); // 7日以内が納期
    
    if (isBefore(date, today)) {
      return "text-red-500"; // 期限切れ
    } else if (isBefore(date, nearDueDate)) {
      return "text-amber-500"; // 期限が近い
    }
    return "text-green-500"; // 十分な余裕がある
  };

  // モバイル用のカードビュー
  const MobileView = () => (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id} className="overflow-hidden transition-all duration-200 hover:shadow-md group bg-white">
          <CardContent className="p-0">
            <div className="p-4 relative">
              <div className="absolute top-0 right-0 p-4">
                <Badge 
                  className={cn(
                    "border", 
                    statusVariants[project.status].color,
                    "px-2.5 py-0.5 text-xs flex items-center gap-1.5 capitalize"
                  )}
                >
                  {statusVariants[project.status].icon}
                  {statusLabels[project.status]}
                </Badge>
              </div>
              
              <div className="pt-6">
                <Link href={`/projects/${project.id}`} className="text-lg font-medium text-primary hover:underline">
                  <span className="text-muted-foreground mr-2">#{String(project.id).padStart(3, '0')}</span>
                  {project.name}
                </Link>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">顧客名</p>
                    <p className="font-medium">{project.clientName}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Calendar className={cn("h-4 w-4 mt-0.5", getDueDateStatus(project.dueDate))} />
                  <div>
                    <p className="text-muted-foreground text-xs">納期</p>
                    <p className={cn("font-medium", getDueDateStatus(project.dueDate))}>
                      {format(new Date(project.dueDate), "yyyy年M月d日")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">報酬総額</p>
                    <p className="font-medium">¥{project.totalReward.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">報酬分配</p>
                    <Badge variant={project.rewardDistributed ? "default" : "outline"} className="font-normal">
                      {project.rewardDistributed ? "完了" : "未分配"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-0 bg-muted/50">
            <Link href={`/projects/${project.id}`} className="w-full">
              <Button variant="ghost" className="w-full rounded-none justify-between transition-colors group-hover:bg-muted/80">
                <span>詳細を見る</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  // デスクトップ用のテーブルビュー
  const DesktopView = () => (
    <div className="rounded-md border shadow-sm">
      <Table>
        <TableHeader className="bg-primary/5">
          <TableRow>
            <TableHead className="font-semibold text-primary">プロジェクト名</TableHead>
            <TableHead className="font-semibold text-primary">状態</TableHead>
            <TableHead className="font-semibold text-primary">顧客名</TableHead>
            <TableHead className="font-semibold text-primary">納期</TableHead>
            <TableHead className="font-semibold text-primary">報酬総額</TableHead>
            <TableHead className="font-semibold text-primary">報酬分配</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, i) => (
            <TableRow 
              key={project.id} 
              className={cn(
                "transition-colors hover:bg-primary/5",
                i % 2 === 0 ? "bg-white" : "bg-slate-50"
              )}
            >
              <TableCell className="font-medium">
                <Link href={`/projects/${project.id}`} className="text-primary hover:underline hover:text-primary/80 transition-colors">
                  <span className="text-muted-foreground mr-2">#{String(project.id).padStart(3, '0')}</span>
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge 
                  className={cn(
                    "border", 
                    statusVariants[project.status].color,
                    "px-2.5 py-0.5 text-xs flex items-center gap-1.5"
                  )}
                >
                  {statusVariants[project.status].icon}
                  {statusLabels[project.status]}
                </Badge>
              </TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell className={getDueDateStatus(project.dueDate)}>
                {format(new Date(project.dueDate), "yyyy年M月d日")}
              </TableCell>
              <TableCell className="font-medium">
                ¥{project.totalReward.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge 
                  variant={project.rewardDistributed ? "default" : "outline"} 
                  className={cn(
                    "font-normal",
                    project.rewardDistributed 
                      ? "bg-green-200 text-green-700 hover:bg-green-300" 
                      : "border-amber-300 text-amber-700 hover:bg-amber-100"
                  )}
                >
                  {project.rewardDistributed ? "完了" : "未分配"}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/30 rounded-lg border border-dashed">
          <Briefcase className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">プロジェクトがありません</h3>
          <p className="text-muted-foreground mt-1">新しいプロジェクトを作成してみましょう</p>
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <MobileView />
          </div>
          <div className="hidden md:block">
            <DesktopView />
          </div>
        </>
      )}
    </>
  );
}