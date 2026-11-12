import Markdown from "@/components/Markdown";

export default function OverviewDescription({description}: { description: string | undefined }) {
  return (
    <>
      {description ? (
        <Markdown content={description} className="prose-sm" />
      ) : (
        <p className="text-muted-foreground text-sm">No description provided.</p>
      )}
    </>
  )
}