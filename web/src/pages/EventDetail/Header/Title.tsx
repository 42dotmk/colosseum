import EventStatus from "./EventStatus/EventStatus";

type TitleProps = {
  title: string;
  isActive: boolean;
  isUpcoming: boolean;
  isEnded: boolean;
}

export default function Title({ title, isActive, isUpcoming, isEnded }: TitleProps) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EventStatus
        isActive={isActive}
        isEnded={isEnded}
        isUpcoming={isUpcoming} />
    </div>
  )
}