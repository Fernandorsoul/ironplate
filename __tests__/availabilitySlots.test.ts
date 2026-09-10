import {
  expandBlockouts,
  generateBookableSlots,
  zonedDateTimeToUtc,
  type AvailabilityRuleRecord,
} from '../api/services/availabilitySlots';

const mondayRule: AvailabilityRuleRecord = {
  id: 'rule-1',
  appointmentType: 'fitness_session',
  weekday: 1,
  startTime: '08:00',
  endTime: '12:00',
  timeZone: 'America/Sao_Paulo',
  durationMinutes: 60,
  slotIntervalMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minimumNoticeMinutes: 0,
  maximumBookingDays: 90,
  effectiveFrom: '2026-09-01',
};

describe('availability slot engine', () => {
  it('converts local professional time to UTC', () => {
    expect(zonedDateTimeToUtc('2026-09-14', '08:00', 'America/Sao_Paulo')?.toISOString())
      .toBe('2026-09-14T11:00:00.000Z');
  });

  it('generates every fitting slot in a weekly window', () => {
    const slots = generateBookableSlots({
      rules: [mondayRule],
      blockouts: [],
      appointments: [],
      appointmentType: 'fitness_session',
      rangeStart: new Date('2026-09-14T00:00:00.000Z'),
      rangeEnd: new Date('2026-09-15T00:00:00.000Z'),
      now: new Date('2026-09-10T00:00:00.000Z'),
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      '2026-09-14T11:00:00.000Z',
      '2026-09-14T12:00:00.000Z',
      '2026-09-14T13:00:00.000Z',
      '2026-09-14T14:00:00.000Z',
    ]);
  });

  it('removes slots intersecting single and recurring blockouts', () => {
    const slots = generateBookableSlots({
      rules: [mondayRule],
      blockouts: [
        {
          id: 'single',
          recurrence: 'single',
          startsAt: '2026-09-14T12:30:00.000Z',
          endsAt: '2026-09-14T13:30:00.000Z',
          timeZone: 'America/Sao_Paulo',
        },
        {
          id: 'weekly',
          recurrence: 'weekly',
          weekday: 1,
          startTime: '11:00',
          endTime: '12:00',
          timeZone: 'America/Sao_Paulo',
          effectiveFrom: '2026-09-01',
        },
      ],
      appointments: [],
      appointmentType: 'fitness_session',
      rangeStart: new Date('2026-09-14T00:00:00.000Z'),
      rangeEnd: new Date('2026-09-15T00:00:00.000Z'),
      now: new Date('2026-09-10T00:00:00.000Z'),
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual(['2026-09-14T11:00:00.000Z']);
  });

  it('respects buffers around existing appointments', () => {
    const slots = generateBookableSlots({
      rules: [{ ...mondayRule, bufferAfterMinutes: 30 }],
      blockouts: [],
      appointments: [{
        startsAt: '2026-09-14T13:30:00.000Z',
        endsAt: '2026-09-14T14:00:00.000Z',
        bufferBeforeMinutes: 15,
      }],
      appointmentType: 'fitness_session',
      rangeStart: new Date('2026-09-14T00:00:00.000Z'),
      rangeEnd: new Date('2026-09-15T00:00:00.000Z'),
      now: new Date('2026-09-10T00:00:00.000Z'),
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      '2026-09-14T11:00:00.000Z',
      '2026-09-14T14:00:00.000Z',
    ]);
  });

  it('enforces minimum notice and maximum booking horizon per rule', () => {
    const slots = generateBookableSlots({
      rules: [{ ...mondayRule, minimumNoticeMinutes: 12 * 60, maximumBookingDays: 2 }],
      blockouts: [],
      appointments: [],
      appointmentType: 'fitness_session',
      rangeStart: new Date('2026-09-14T00:00:00.000Z'),
      rangeEnd: new Date('2026-09-15T00:00:00.000Z'),
      now: new Date('2026-09-12T12:30:00.000Z'),
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      '2026-09-14T11:00:00.000Z',
      '2026-09-14T12:00:00.000Z',
    ]);
  });

  it('handles the DST spring-forward gap without inventing local times', () => {
    const slots = generateBookableSlots({
      rules: [{
        ...mondayRule,
        weekday: 0,
        startTime: '01:00',
        endTime: '04:00',
        timeZone: 'America/New_York',
        effectiveFrom: '2026-03-01',
      }],
      blockouts: [],
      appointments: [],
      appointmentType: 'fitness_session',
      rangeStart: new Date('2026-03-08T00:00:00.000Z'),
      rangeEnd: new Date('2026-03-09T00:00:00.000Z'),
      now: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      '2026-03-08T06:00:00.000Z',
      '2026-03-08T07:00:00.000Z',
    ]);
  });

  it('expands recurring blockouts only inside their effective dates', () => {
    const intervals = expandBlockouts([{
      id: 'weekly',
      recurrence: 'weekly',
      weekday: 5,
      startTime: '14:00',
      endTime: '18:00',
      timeZone: 'America/Sao_Paulo',
      effectiveFrom: '2026-09-01',
      effectiveUntil: '2026-09-30',
    }], new Date('2026-09-01T00:00:00.000Z'), new Date('2026-10-10T00:00:00.000Z'));

    expect(intervals).toHaveLength(4);
    expect(new Date(intervals[0].startsAt).toISOString()).toBe('2026-09-04T17:00:00.000Z');
  });
});
