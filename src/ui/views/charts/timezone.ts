export type DisplayTimeZone = "local" | "utc";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startOfUtcDay(epochMs: number): number {
  const date = new Date(epochMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function endOfUtcDay(epochMs: number): number {
  return startOfUtcDay(epochMs) + ONE_DAY_MS - 1;
}

export function toUtcYmd(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function parseUtcYmd(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  const utcMs = Date.UTC(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
  if (!Number.isFinite(utcMs)) {
    return null;
  }
  return utcMs;
}

export function lastNUtcDaysRange(days: number, now = Date.now()): { startDate: string; endDate: string } {
  const safeDays = Math.max(1, Math.floor(days));
  const endStartMs = startOfUtcDay(now);
  const startStartMs = endStartMs - (safeDays - 1) * ONE_DAY_MS;
  return {
    startDate: toUtcYmd(startStartMs),
    endDate: toUtcYmd(endStartMs),
  };
}

export function toLocalYmd(epochMs: number): string {
  const date = new Date(epochMs);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localTodayYmd(now = Date.now()): string {
  return toLocalYmd(now);
}

export function localCurrentDayUtcCoverageRange(now = Date.now()): {
  startDate: string;
  endDate: string;
  localDate: string;
} {
  const localNow = new Date(now);
  const localStart = new Date(
    localNow.getFullYear(),
    localNow.getMonth(),
    localNow.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const localEnd = localStart + ONE_DAY_MS - 1;

  return {
    startDate: toUtcYmd(startOfUtcDay(localStart)),
    endDate: toUtcYmd(startOfUtcDay(localEnd)),
    localDate: localTodayYmd(now),
  };
}

function effectiveTimeZone(displayTimeZone: DisplayTimeZone): string {
  if (displayTimeZone === "utc") {
    return "UTC";
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function intlPartsFormatter(displayTimeZone: DisplayTimeZone): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: effectiveTimeZone(displayTimeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function formatForDisplayTz(
  epochMs: number,
  displayTimeZone: DisplayTimeZone,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: effectiveTimeZone(displayTimeZone),
    ...opts,
  }).format(new Date(epochMs));
}

export function formatUtcYmdForDisplay(
  ymd: string,
  displayTimeZone: DisplayTimeZone,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const parsed = parseUtcYmd(ymd);
  if (parsed == null) {
    return ymd;
  }
  return formatForDisplayTz(parsed, displayTimeZone, opts);
}

export function displayHourFromEpoch(epochMs: number, displayTimeZone: DisplayTimeZone): number {
  if (displayTimeZone === "utc") {
    return new Date(epochMs).getUTCHours();
  }
  return new Date(epochMs).getHours();
}

export function displayWeekdayFromEpoch(epochMs: number, displayTimeZone: DisplayTimeZone): number {
  if (displayTimeZone === "utc") {
    return new Date(epochMs).getUTCDay();
  }
  return new Date(epochMs).getDay();
}

export function setToDisplayHourEnd(date: Date, displayTimeZone: DisplayTimeZone): Date {
  if (displayTimeZone === "utc") {
    const next = new Date(date);
    next.setUTCMinutes(59, 59, 999);
    return next;
  }
  const next = new Date(date);
  next.setMinutes(59, 59, 999);
  return next;
}

export function tooltipDateTime(epochMs: number, displayTimeZone: DisplayTimeZone): string {
  return formatForDisplayTz(epochMs, displayTimeZone, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function axisDateLabel(ymd: string, displayTimeZone: DisplayTimeZone): string {
  return formatUtcYmdForDisplay(ymd, displayTimeZone, {
    month: "short",
    day: "numeric",
  });
}

export function normalizeLogTimestamp(ts: number): number {
  return ts < 1e12 ? ts * 1000 : ts;
}

export function displayTimeZoneLabel(displayTimeZone: DisplayTimeZone): string {
  return displayTimeZone === "local" ? "Local" : "UTC";
}

export function parseDateTimeParts(epochMs: number, displayTimeZone: DisplayTimeZone): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = intlPartsFormatter(displayTimeZone).formatToParts(new Date(epochMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((entry) => entry.type === type)?.value ?? "0";
    return Number.parseInt(value, 10);
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}
