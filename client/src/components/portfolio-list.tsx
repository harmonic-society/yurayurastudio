import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { type Portfolio } from "@shared/schema";

interface PortfolioListProps {
  projectId: number;
  portfolios: Portfolio[];
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
}

export default function PortfolioList({
  projectId,
  portfolios,
  onEdit,
  onDelete
}: PortfolioListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {portfolios.map((portfolio) => (
        <Card key={portfolio.id}>
          <div className="relative aspect-video">
            <img
              src={portfolio.imageUrl}
              alt={`成果物 ${portfolio.id}`}
              className="object-cover w-full h-full rounded-t-lg"
            />
          </div>
          <CardContent className="pt-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(portfolio)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(portfolio)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              作成日: {format(new Date(portfolio.createdAt), "yyyy年M月d日")}
            </p>
          </CardContent>
        </Card>
      ))}
      {portfolios.length === 0 && (
        <p className="text-center text-muted-foreground col-span-full">
          まだ成果物が登録されていません
        </p>
      )}
    </div>
  );
}