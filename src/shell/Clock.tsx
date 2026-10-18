"use client";

import { useSyncExternalStore } from "react";

/** One shared ticking source, aligned to the minute so the display flips on time. */
function subscribe(onTick: () => void) {
  let interval: number | undefined;
  const timeout = window.setTimeout(
    () => {
      onTick();
      interval = window.setInterval(onTick, 60_000);
    },
    60_000 - (Date.now() % 60_000),
  );
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

// Snapshot at minute resolution so React sees a stable value between ticks.
const getSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = () => null;

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function useMinute(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute === null ? null : new Date(minute * 60_000);
}

/**
 * Renders nothing on the server (the time there is meaningless to the
 * visitor), then the visitor's local time after hydration. Width is reserved
 * so nothing shifts when it appears.
 */
export function Clock({ showDate = true }: { showDate?: boolean }) {
  const now = useMinute();
  return (
    <time
      className="inline-block min-w-[4.5rem] text-right tabular-nums"
      dateTime={now?.toISOString()}
      suppressHydrationWarning
    >
      {now
        ? showDate
          ? `${dateFmt.format(now)}  ${timeFmt.format(now)}`
          : timeFmt.format(now)
        : ""}
    </time>
  );
}
