import { useEffect, useState } from "react";
import { getTimeRemaining } from "../utils";

export default function TimeRemaining({ endDate }: {endDate: Date}) {
  const [timeRemaining, setTimeRemaining] = useState('');


  useEffect(() => {
    if (!event) return;

    //const endDate = new Date(event.end);
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining(endDate));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="text-right shrink-0">
      <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>
      <div className="font-mono text-2xl font-semibold text-amber-500 tabular-nums">
        {timeRemaining}
      </div>
    </div>
  )
}