import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabsListComponentProps = {
  questionsLength: number;
}

export default function TabsListComponent({ questionsLength }: TabsListComponentProps) {
  return (
    <TabsList className="mb-6">
      <TabsTrigger value="problems">Problems</TabsTrigger>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="qa" className="gap-2">
        Q&A
        {questionsLength > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {questionsLength}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
    </TabsList>
  )
}