import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              alt={portfolio.title}
              className="object-cover w-full h-full rounded-t-lg"
            />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="truncate">{portfolio.title}</span>
              <div className="flex gap-2 ml-2 shrink-0">
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
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{portfolio.workType}</p>
            <p className="text-sm line-clamp-3">{portfolio.description}</p>
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
