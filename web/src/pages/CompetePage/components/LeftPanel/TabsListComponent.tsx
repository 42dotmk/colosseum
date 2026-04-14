import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Submission } from "../../types/Submission";

type TabsListComponentProps = {
  isViewMode: boolean,
  submissions: Submission[]
}

export default function TabsListComponent({ isViewMode, submissions }: TabsListComponentProps) {
  return (
    <>
      <div className="border-b px-4 py-2">
        <TabsList className="h-8">
          <TabsTrigger value="description" className="text-xs px-3 h-7">
            Problem
          </TabsTrigger>

          <TabsTrigger value="testcases" className="text-xs px-3 h-7">
            Tests
          </TabsTrigger>

          {!isViewMode && (
            <TabsTrigger value="results" className="text-xs px-3 h-7">
              Results
              {submissions.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({submissions.length})
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
      </div>

    </>
  )
}