export default function TrainingMode({ isTrainingMode }: { isTrainingMode: boolean }) {
  return (
    <>
      {isTrainingMode && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Training mode: submissions are treated as practice and do not affect contest leaderboard.
        </div>
      )}
    </>
  )
}