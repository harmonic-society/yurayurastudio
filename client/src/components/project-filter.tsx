import { projectStatus, type ProjectStatus } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectFilterProps {
  search: string;
  status: ProjectStatus | "ALL";
  onSearchChange: (search: string) => void;
  onStatusChange: (status: ProjectStatus | "ALL") => void;
}

export default function ProjectFilter({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: ProjectFilterProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as ProjectStatus | "ALL")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          {projectStatus.map((status) => (
            <SelectItem key={status} value={status}>
              {status.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
