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
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Project } from "@shared/schema";

const statusColors = {
  NOT_STARTED: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  ON_HOLD: "bg-yellow-500"
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
  // モバイル用のカードビュー
  const MobileView = () => (
    <div className="space-y-4">
      {projects.map((project) => (
        <Card key={project.id}>
          <CardContent className="pt-6 space-y-3">
            <div>
              <Link href={`/projects/${project.id}`}>
                <a className="text-lg font-medium text-blue-500 hover:underline">
                  {project.name}
                </a>
              </Link>
              <Badge className={`ml-2 ${statusColors[project.status]}`}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">顧客名</p>
                <p>{project.clientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">納期</p>
                <p>{format(new Date(project.dueDate), "yyyy年M月d日")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">報酬総額</p>
                <p>¥{project.totalReward.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">報酬分配</p>
                <Badge variant={project.rewardDistributed ? "default" : "secondary"}>
                  {project.rewardDistributed ? "完了" : "未分配"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // デスクトップ用のテーブルビュー
  const DesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>プロジェクト名</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>顧客名</TableHead>
          <TableHead>納期</TableHead>
          <TableHead>報酬総額</TableHead>
          <TableHead>報酬分配</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Link href={`/projects/${project.id}`}>
                <a className="text-blue-500 hover:underline">
                  {project.name}
                </a>
              </Link>
            </TableCell>
            <TableCell>
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </TableCell>
            <TableCell>{project.clientName}</TableCell>
            <TableCell>
              {format(new Date(project.dueDate), "yyyy年M月d日")}
            </TableCell>
            <TableCell>
              ¥{project.totalReward.toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant={project.rewardDistributed ? "default" : "secondary"}>
                {project.rewardDistributed ? "完了" : "未分配"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <div className="md:hidden">
        <MobileView />
      </div>
      <div className="hidden md:block">
        <DesktopView />
      </div>
    </>
  );
}