import { TabsContent } from "@/components/ui/tabs";
import { TestCase } from "../../types/TestCase";
import PublicTestCase from "./PublicTestCase";

type TestCasesTabProps = {
  publicTestCases: TestCase[],
}

export default function TestCasesTab({ publicTestCases }: TestCasesTabProps) {
  return (
    <TabsContent value="testcases" className="mt-0 h-full">
      <div className="space-y-3">
        {publicTestCases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No public test cases available
          </p>
        ) : (
          publicTestCases.map((tc: TestCase, index: number) => (
            <PublicTestCase tc={tc} index={index} />
          ))
        )}
      </div>
    </TabsContent>
  )
}