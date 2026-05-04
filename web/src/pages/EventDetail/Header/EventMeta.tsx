type EventMetaProps = {
  startDate: Date;
  endDate: Date;
  visibleProblemsLength: number;
}

export default function EventMeta({ startDate, endDate, visibleProblemsLength }: EventMetaProps) {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>
        {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        {' · '}
        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {' – '}
        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span>·</span>
      <span>{visibleProblemsLength} {visibleProblemsLength === 1 ? 'problem' : 'problems'}</span>
    </div>
  )
}