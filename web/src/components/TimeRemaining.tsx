import { useEffect, useState } from "react";
import { getTimeRemaining } from "../pages/EventDetail/utils";

export default function TimeRemaining({ endDate, variant }: {endDate: Date, variant: 'event-detail' | 'compete'}) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining(endDate));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="text-right shrink-0">
      {variant==='event-detail' && <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>}
      <div className="font-mono text-2xl font-semibold text-amber-500 tabular-nums">
        {timeRemaining}
      </div>
    </div>
  )
}