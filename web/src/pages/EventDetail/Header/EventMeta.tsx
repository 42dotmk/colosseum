type EventMetaProps = {
  startDate: Date;
  endDate: Date;
  visibleProblemsLength: number;
}

export default function EventMeta({ startDate, endDate, visibleProblemsLength }: EventMetaProps) {
  const isSameDay = startDate.toDateString() === endDate.toDateString();
  const isSameYear = startDate.getFullYear() === endDate.getFullYear();

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>
        {startDate.toLocaleDateString(undefined, { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric',
          ...(isSameYear? {} : {year: 'numeric'}) })}
        {' · '}
        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {' – '}
        {!isSameDay && endDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          ...(isSameYear? {} : {year: 'numeric'})
        })}
        {' · '}
        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span>·</span>
      <span>{visibleProblemsLength} {visibleProblemsLength === 1 ? 'problem' : 'problems'}</span>
    </div>
  )
}