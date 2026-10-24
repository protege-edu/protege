"use client";

import { useEffect, useState } from "react";

/** Blinks at random, every 2 to 6 seconds, and sometimes twice in a row. Like a real face. */
export function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const blink = (times: number) => {
      setClosed(true);
      timer = setTimeout(() => {
        setClosed(false);
        timer = times > 1 ? setTimeout(() => blink(times - 1), 140) : schedule();
      }, 110);
    };
    const schedule = () => setTimeout(() => blink(Math.random() < 0.2 ? 2 : 1), 2000 + Math.random() * 4000);
    timer = schedule();
    return () => clearTimeout(timer);
  }, [enabled]);

  return enabled && closed;
}
