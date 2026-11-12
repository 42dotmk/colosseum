import Markdown from "@/components/Markdown";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";

type ProblemTabProps = {
  problemDescription: string | undefined,
  testCasesLength: number,
  publicTestCasesLength: number
}

export default function ProblemTab({problemDescription,testCasesLength,publicTestCasesLength}: ProblemTabProps) {
  return (
    <>
      <TabsContent value="description" className="mt-0 h-full">
        <div className="space-y-4">
          {/* problem description - colors come from Markdown (light prose, dark:prose-invert) */}
          <Markdown content={problemDescription || ''} className="prose-sm" />

          <Separator />

          {/* Test cases */}
          <div className="text-xs text-muted-foreground">
            {testCasesLength} test cases ({publicTestCasesLength} visible)
          </div>
        </div>
      </TabsContent>
    </>
  )
}