"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => setTime(format(new Date(), "HH:mm:ss"));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="min-w-[72px] text-right font-mono text-sm text-[#8B949E]">
      {time}
    </span>
  );
}
