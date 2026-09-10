# Professional appointment workflow

Appointments are exposed through:

`/api/users/get?resource=professionals&operation=appointments`

Notifications are exposed through the same route with `operation=notifications`.

## Request and hold

A student may request only a slot returned by the professional availability endpoint and only
while an active link grants `scheduling` consent. The appointment type must match the verified
registration: CREF for fitness and CRN for nutrition.

The request starts as `requested`; it is never confirmed automatically. The selected rule's
`requestHoldMinutes` controls the temporary hold. Expired holds are transitioned to `expired`
before availability checks and no longer occupy the slot.

The PostgreSQL GiST exclusion constraint on buffered intervals resolves concurrent requests at the
database boundary. A loser receives HTTP 409 and must refresh the slot list.

## State transitions

Professionals can:

- confirm or decline a live request;
- propose one to five currently bookable replacement slots;
- cancel a requested, confirmed, or reschedule-proposed appointment;
- mark confirmed appointments completed or no-show.

Students can:

- cancel their own active appointment;
- accept only a slot included in the professional's proposal;
- decline a proposal and restore the status held before that proposal.

An accepted proposal returns to `requested` with a fresh configurable hold so the final time still
receives explicit professional confirmation. The previous time and accepted time remain in the
immutable appointment event metadata.

Updates use the current status in the SQL predicate. The state transition and its event are written
by one CTE, so concurrent decisions cannot both succeed.

## Privacy and notifications

GET returns only appointments where the authenticated user is the professional or student.
Calendar titles and notification messages are neutral and do not include diagnoses, measurements,
private blockout reasons, or another student's identity. Optional decision messages are stored in
the participant-only event trail rather than notification text.

In-app notifications are a separate side effect. Delivery failure is logged but does not roll back
the appointment transition, leaving a stable interface for future push and email adapters.

Appointment records, event history, and notifications are included in LGPD export and deletion.
