import { projectStatus, type ProjectStatus } from "@shared/schema";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels = {
  ALL: "全ての状態",
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  ON_HOLD: "保留"
} as const;

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
          placeholder="プロジェクトを検索..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as ProjectStatus | "ALL")}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="状態で絞り込み" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{statusLabels.ALL}</SelectItem>
          {projectStatus.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabels[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}