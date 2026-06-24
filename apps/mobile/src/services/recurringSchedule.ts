export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function advanceNextRun(current: Date, frequency: RecurringFrequency): Date {
  const next = new Date(current);
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (frequency === "monthly") {
    return addMonths(next, 1);
  }
  return addMonths(next, 12);
}

export function computeInitialNextRun(anchor: Date, frequency: RecurringFrequency, now = new Date()): Date {
  let candidate = new Date(anchor);
  candidate.setHours(9, 0, 0, 0);
  while (candidate <= now) {
    candidate = advanceNextRun(candidate, frequency);
  }
  return candidate;
}

export function anchorFromDateIso(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const anchor = new Date(y, m - 1, d, 9, 0, 0, 0);
  return anchor;
}

export function frequencyLabelKey(frequency: RecurringFrequency): string {
  return `recurring.freq.${frequency}`;
}
