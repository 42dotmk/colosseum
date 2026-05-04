import { Badge } from "@/components/ui/badge";
import ActiveEvent from "./ActiveEvent";

type EventStatusProps = {
  isActive: boolean;
  isUpcoming: boolean;
  isEnded: boolean;
}

export default function EventStatus({ isActive, isUpcoming, isEnded }: EventStatusProps) {
  return (
    <>
      {isActive && <ActiveEvent />}
      {isUpcoming && <Badge variant="secondary">Upcoming</Badge>}
      {isEnded && <Badge variant="outline" className="text-muted-foreground">Ended</Badge>}
    </>
  )
}