import { TestCase } from "../../types/TestCase";

export default function PublicTestCase({tc, index}: {tc: TestCase, index: number}) {
  return (
    <>
      <div key={tc.documentId} className="rounded-lg border p-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Test {index + 1}
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Input</div>
          <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
            {tc.input}
          </pre>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Expected</div>
          <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
            {tc.output}
          </pre>
        </div>
      </div>
    </>
  )
}