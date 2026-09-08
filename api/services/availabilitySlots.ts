export interface AvailabilityRuleRecord {
  id: string;
  appointmentType: string;
  weekday: number;
  startTime: string;
  endTime: string;
  timeZone: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maximumBookingDays: number;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface BlockoutRecord {
  id: string;
  recurrence: 'single' | 'weekly';
  startsAt?: string | Date;
  endsAt?: string | Date;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  timeZone: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export interface BusyInterval {
  startsAt: string | Date;
  endsAt: string | Date;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

export interface BookableSlot {
  ruleId: string;
  appointmentType: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  durationMinutes: number;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function formatLocalDate(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>): string {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
}

function localDateAt(instant: Date, timeZone: string): string {
  return formatLocalDate(zonedParts(instant, timeZone));
}

function addLocalDays(date: string, days: number): string {
  const parts = parseLocalDate(date);
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatLocalDate({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

function localWeekday(date: string): number {
  const parts = parseLocalDate(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Converts a wall-clock time to UTC and rejects nonexistent DST wall times. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date | undefined {
  const local = parseLocalDate(date);
  const [hour, minute] = time.split(':').map(Number);
  const desired = Date.UTC(local.year, local.month - 1, local.day, hour, minute);
  let candidate = desired;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(new Date(candidate), timeZone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const adjustment = desired - actualAsUtc;
    if (adjustment === 0) break;
    candidate += adjustment;
  }

  const roundTrip = zonedParts(new Date(candidate), timeZone);
  if (
    roundTrip.year !== local.year
    || roundTrip.month !== local.month
    || roundTrip.day !== local.day
    || roundTrip.hour !== hour
    || roundTrip.minute !== minute
  ) return undefined;
  return new Date(candidate);
}

function intervalOverlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

export function expandBlockouts(
  blockouts: BlockoutRecord[],
  rangeStart: Date,
  rangeEnd: Date,
): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  for (const blockout of blockouts) {
    if (blockout.recurrence === 'single') {
      if (blockout.startsAt && blockout.endsAt) {
        intervals.push({ startsAt: blockout.startsAt, endsAt: blockout.endsAt });
      }
      continue;
    }

    if (
      blockout.weekday == null
      || !blockout.startTime
      || !blockout.endTime
      || !blockout.effectiveFrom
    ) continue;
    let date = localDateAt(new Date(rangeStart.getTime() - DAY_MS), blockout.timeZone);
    const finalDate = localDateAt(new Date(rangeEnd.getTime() + DAY_MS), blockout.timeZone);
    while (date <= finalDate) {
      const active = date >= blockout.effectiveFrom
        && (!blockout.effectiveUntil || date <= blockout.effectiveUntil)
        && localWeekday(date) === blockout.weekday;
      if (active) {
        const startsAt = zonedDateTimeToUtc(date, blockout.startTime, blockout.timeZone);
        const endsAt = zonedDateTimeToUtc(date, blockout.endTime, blockout.timeZone);
        if (startsAt && endsAt && endsAt > startsAt) intervals.push({ startsAt, endsAt });
      }
      date = addLocalDays(date, 1);
    }
  }
  return intervals;
}

export function generateBookableSlots(input: {
  rules: AvailabilityRuleRecord[];
  blockouts: BlockoutRecord[];
  appointments: BusyInterval[];
  appointmentType: string;
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
}): BookableSlot[] {
  const now = input.now ?? new Date();
  const blockoutIntervals = expandBlockouts(input.blockouts, input.rangeStart, input.rangeEnd);
  const busy = [...blockoutIntervals, ...input.appointments].map((interval) => ({
    start: new Date(interval.startsAt).getTime() - (interval.bufferBeforeMinutes ?? 0) * MINUTE_MS,
    end: new Date(interval.endsAt).getTime() + (interval.bufferAfterMinutes ?? 0) * MINUTE_MS,
  }));
  const slots: BookableSlot[] = [];
  const seen = new Set<string>();

  for (const rule of input.rules.filter((item) => item.appointmentType === input.appointmentType)) {
    let date = localDateAt(new Date(input.rangeStart.getTime() - DAY_MS), rule.timeZone);
    const finalDate = localDateAt(new Date(input.rangeEnd.getTime() + DAY_MS), rule.timeZone);
    while (date <= finalDate) {
      const active = date >= rule.effectiveFrom
        && (!rule.effectiveUntil || date <= rule.effectiveUntil)
        && localWeekday(date) === rule.weekday;
      if (active) {
        const windowStart = zonedDateTimeToUtc(date, rule.startTime, rule.timeZone);
        const windowEnd = zonedDateTimeToUtc(date, rule.endTime, rule.timeZone);
        if (windowStart && windowEnd) {
          for (
            let startsAt = windowStart.getTime();
            startsAt + rule.durationMinutes * MINUTE_MS <= windowEnd.getTime();
            startsAt += rule.slotIntervalMinutes * MINUTE_MS
          ) {
            const endsAt = startsAt + rule.durationMinutes * MINUTE_MS;
            const earliest = now.getTime() + rule.minimumNoticeMinutes * MINUTE_MS;
            const latest = now.getTime() + rule.maximumBookingDays * DAY_MS;
            const occupiedStart = startsAt - rule.bufferBeforeMinutes * MINUTE_MS;
            const occupiedEnd = endsAt + rule.bufferAfterMinutes * MINUTE_MS;
            const unavailable = busy.some((interval) => intervalOverlaps(
              occupiedStart,
              occupiedEnd,
              interval.start,
              interval.end,
            ));
            const key = `${input.appointmentType}:${startsAt}:${endsAt}`;
            if (
              startsAt >= input.rangeStart.getTime()
              && endsAt <= input.rangeEnd.getTime()
              && startsAt >= earliest
              && startsAt <= latest
              && !unavailable
              && !seen.has(key)
            ) {
              seen.add(key);
              slots.push({
                ruleId: rule.id,
                appointmentType: rule.appointmentType,
                startsAt: new Date(startsAt).toISOString(),
                endsAt: new Date(endsAt).toISOString(),
                timeZone: rule.timeZone,
                durationMinutes: rule.durationMinutes,
              });
            }
          }
        }
      }
      date = addLocalDays(date, 1);
    }
  }

  return slots.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}
