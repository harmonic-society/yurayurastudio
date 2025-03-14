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
import { format } from "date-fns";
import type { Project } from "@shared/schema";

const statusColors = {
  NOT_STARTED: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  ON_HOLD: "bg-yellow-500"
} as const;

interface ProjectListProps {
  projects: Project[];
}

export default function ProjectList({ projects }: ProjectListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Total Reward</TableHead>
          <TableHead>Distributed</TableHead>
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
                {project.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>{project.clientName}</TableCell>
            <TableCell>
              {format(new Date(project.dueDate), "MMM d, yyyy")}
            </TableCell>
            <TableCell>
              ${project.totalReward.toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant={project.rewardDistributed ? "success" : "secondary"}>
                {project.rewardDistributed ? "Yes" : "No"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
