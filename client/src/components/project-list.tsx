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
    color: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-500/50",
    icon: <Clock className="h-3.5 w-3.5 text-slate-500" />
  },
  IN_PROGRESS: {
    color: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/50",
    icon: <Clock className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
  },
  COMPLETED: {
    color: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-500/50",
    icon: <Clock className="h-3.5 w-3.5 text-green-500" />
  },
  ON_HOLD: {
    color: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 border-yellow-500/50",
    icon: <Clock className="h-3.5 w-3.5 text-yellow-500" />
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
        <Card key={project.id} className="overflow-hidden transition-all duration-200 hover:shadow-md group">
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
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>プロジェクト名</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>顧客名</TableHead>
            <TableHead>納期</TableHead>
            <TableHead>報酬総額</TableHead>
            <TableHead>報酬分配</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="transition-colors hover:bg-muted/30">
              <TableCell className="font-medium">
                <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>{project.clientName}</TableCell>
              <TableCell className={getDueDateStatus(project.dueDate)}>
                {format(new Date(project.dueDate), "yyyy年M月d日")}
              </TableCell>
              <TableCell className="font-medium">
                ¥{project.totalReward.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={project.rewardDistributed ? "default" : "outline"} className="font-normal">
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