# Professional availability and schedule blockouts

The scheduling foundation is exposed through:

`/api/users/get?resource=professionals&operation=availability`

All writes require an approved professional profile. CREF registrations may configure fitness
sessions and assessments; CRN registrations may configure nutrition consultations and assessments.
Student slot reads additionally require an active professional-student link with granted
`scheduling` consent.

## Weekly rules

A rule stores an IANA time zone, weekday, local start/end wall-clock times, appointment type,
duration, slot interval, buffers, minimum notice, maximum booking horizon, and effective dates.
Multiple rules may exist on the same weekday. Rules are deactivated instead of deleted so audit
history remains available.

Defaults are 12 hours of minimum notice, a 90-day booking horizon, and no buffer. Callers should
send the explicit values shown in the professional settings UI so configuration remains portable.

## Blockouts

Blockouts may be a single UTC interval or a weekly local-time recurrence with effective dates.
The reason category and free-form reason are private and are returned only in the authenticated
professional configuration view. Student responses contain only bookable slots.

Send `preview: true` before creating or editing a blockout. The response lists affected requested
or confirmed appointments and the actions allowed for each status. Saving requires one explicit
decision per affected appointment. Confirmed appointments are never cancelled automatically.
Non-keep decisions create an appointment event and a neutral in-app notification that never
contains the private blockout reason.

Recurring blockouts support `cancel_future` with `effectiveUntil`. Existing appointment state is
not reopened or rewritten when a rule or blockout changes.

## Slot calculation

The slot endpoint accepts a maximum 31-day UTC interval and returns only slots that satisfy all of:

- weekly availability in the professional's IANA time zone;
- rule effective dates, duration, slot interval, minimum notice, and maximum booking horizon;
- buffers around the candidate and existing events;
- no active single or recurring blockout;
- no confirmed event, reschedule proposal, or unexpired request hold.

Wall-clock boundaries are converted with `Intl.DateTimeFormat`. Nonexistent local times during a
DST transition are rejected, while stored appointment instants remain UTC.

## Concurrency

Migration `0006_careful_skrulls.sql` adds a PostgreSQL GiST exclusion constraint over each
professional's buffered appointment interval for occupying statuses. This is the database-level
guard against concurrent overlapping requests or confirmations. Issue #100 is responsible for
expiring stale holds before creating or transitioning appointment records.

Creation, update, deactivation, future cancellation, and impact decisions are recorded in the
audit/event trail. Availability, blockouts, appointments, events, and notifications are included
in LGPD export and account deletion flows.
