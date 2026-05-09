export default function ViewMode({ isViewMode }: { isViewMode: boolean }) {
  return (
    <>
      {isViewMode && (
        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          This problem is opened in view mode from a past event. Submissions are disabled.
        </div>
      )}
    </>
  )
}