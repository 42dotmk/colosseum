import Markdown from "@/components/Markdown";

export default function OverviewDescription({description}: { description: string | undefined }) {
  return (
    <>
      {description ? (
        <div className="prose prose-sm prose-invert max-w-none">
          <Markdown content={description} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No description provided.</p>
      )}
    </>
  )
}