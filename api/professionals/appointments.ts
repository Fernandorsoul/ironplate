import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalAppointmentPostSchema,
  professionalAppointmentPutSchema,
  validationError,
} from '../middleware/validation';
import {
  getApprovedProfessionalRegistrations,
  getScopedActiveLink,
  registrationAllowsAppointmentType,
} from '../services/professionalAccess';
import { generateBookableSlots, type AvailabilityRuleRecord } from '../services/availabilitySlots';
import { writeAuditLog } from '../services/audit';

const OCCUPYING_STATUSES = ['confirmed', 'reschedule_proposed'];

function parseJsonArray(value: unknown): any[] {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function mapRule(row: Record<string, any>): AvailabilityRuleRecord {
  return {
    id: row.id,
    appointmentType: row.appointment_type,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    timeZone: row.time_zone,
    durationMinutes: row.duration_minutes,
    slotIntervalMinutes: row.slot_interval_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    minimumNoticeMinutes: row.minimum_notice_minutes,
    maximumBookingDays: row.maximum_booking_days,
    requestHoldMinutes: row.request_hold_minutes,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until ?? undefined,
  };
}

async function expireStaleRequests(sql: any, professionalId: string): Promise<void> {
  const expired = await sql`
    UPDATE professional_appointments
    SET status = 'expired', updated_at = NOW()
    WHERE professional_id = ${professionalId}
      AND status = 'requested'
      AND hold_expires_at <= NOW()
    RETURNING id, student_id
  `;
  for (const appointment of expired as Record<string, any>[]) {
    await sql`
      INSERT INTO professional_appointment_events (
        id, appointment_id, event_type, from_status, to_status
      ) VALUES (${randomUUID()}, ${appointment.id}, 'appointment.expired', 'requested', 'expired')
    `;
    await sendNotification(sql, {
      recipientUserId: appointment.student_id,
      appointmentId: appointment.id,
      type: 'appointment.expired',
      body: 'Uma solicitacao de atendimento expirou sem confirmacao.',
    });
  }
}

async function sendNotification(sql: any, input: {
  recipientUserId: string;
  actorUserId?: string;
  appointmentId: string;
  type: string;
  body: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO professional_notifications (
        id, recipient_user_id, actor_user_id, appointment_id,
        notification_type, title, body
      ) VALUES (
        ${randomUUID()}, ${input.recipientUserId}, ${input.actorUserId ?? null},
        ${input.appointmentId}, ${input.type}, 'Atualizacao de atendimento', ${input.body}
      )
    `;
  } catch (error) {
    // Appointment consistency must not depend on a notification side effect.
    console.error('Appointment notification error:', error);
  }
}

async function findBookableSlot(
  sql: any,
  professionalId: string,
  appointmentType: string,
  startsAt: string,
  excludeAppointmentId?: string,
) {
  const requestedStart = new Date(startsAt);
  const rangeEnd = new Date(requestedStart.getTime() + 8 * 60 * 60 * 1_000);
  const [ruleRows, blockoutRows, appointmentRows] = await Promise.all([
    sql`
      SELECT * FROM professional_availability_rules
      WHERE professional_id = ${professionalId}
        AND appointment_type = ${appointmentType}
        AND active = TRUE
    `,
    sql`
      SELECT * FROM professional_schedule_blockouts
      WHERE professional_id = ${professionalId} AND status = 'active'
    `,
    sql`
      SELECT id, starts_at, ends_at, buffer_before_minutes, buffer_after_minutes
      FROM professional_appointments
      WHERE professional_id = ${professionalId}
        AND id <> ${excludeAppointmentId ?? ''}
        AND starts_at < ${rangeEnd.toISOString()}
        AND ends_at > ${startsAt}
        AND (
          status = ANY(${OCCUPYING_STATUSES})
          OR (status = 'requested' AND hold_expires_at > NOW())
        )
    `,
  ]);
  const rules = (ruleRows as Record<string, any>[]).map(mapRule);
  const slots = generateBookableSlots({
    rules,
    blockouts: (blockoutRows as Record<string, any>[]).map((row) => ({
      id: row.id,
      recurrence: row.recurrence,
      startsAt: row.starts_at ?? undefined,
      endsAt: row.ends_at ?? undefined,
      weekday: row.weekday ?? undefined,
      startTime: row.start_time ?? undefined,
      endTime: row.end_time ?? undefined,
      timeZone: row.time_zone,
      effectiveFrom: row.effective_from ?? undefined,
      effectiveUntil: row.effective_until ?? undefined,
    })),
    appointments: (appointmentRows as Record<string, any>[]).map((row) => ({
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      bufferBeforeMinutes: row.buffer_before_minutes,
      bufferAfterMinutes: row.buffer_after_minutes,
    })),
    appointmentType,
    rangeStart: requestedStart,
    rangeEnd,
  });
  const slot = slots.find((candidate) => candidate.startsAt === requestedStart.toISOString());
  if (!slot) return undefined;
  const rule = rules.find((candidate) => candidate.id === slot.ruleId)!;
  return { slot, rule };
}

export function transitionFor(input: {
  action: string;
  currentStatus: string;
  previousStatus?: string;
  actor: 'professional' | 'student';
}): string | undefined {
  if (input.actor === 'professional') {
    if (input.action === 'confirm' && input.currentStatus === 'requested') return 'confirmed';
    if (input.action === 'decline' && input.currentStatus === 'requested') return 'declined';
    if (input.action === 'propose_reschedule' && ['requested', 'confirmed'].includes(input.currentStatus)) {
      return 'reschedule_proposed';
    }
    if (input.action === 'cancel' && ['requested', 'confirmed', 'reschedule_proposed'].includes(input.currentStatus)) {
      return 'cancelled_by_professional';
    }
    if (input.action === 'complete' && input.currentStatus === 'confirmed') return 'completed';
    if (input.action === 'no_show' && input.currentStatus === 'confirmed') return 'no_show';
    return undefined;
  }
  if (input.action === 'cancel' && ['requested', 'confirmed', 'reschedule_proposed'].includes(input.currentStatus)) {
    return 'cancelled_by_student';
  }
  if (input.action === 'accept_reschedule' && input.currentStatus === 'reschedule_proposed') return 'requested';
  if (input.action === 'decline_reschedule' && input.currentStatus === 'reschedule_proposed') {
    return input.previousStatus || 'requested';
  }
  return undefined;
}

function isScheduleConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '23P01');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res, ['GET', 'POST', 'PUT'])) return;
  if (!['GET', 'POST', 'PUT'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const identity = await requireAuth(req, res);
  if (!identity) return;
  const sql = getSql();
  if (!sql) return res.status(500).json({ error: 'Database not configured' });

  await generalRateLimit(req, res, async () => {
    try {
      if (req.method === 'GET') {
        let rows = await sql`
          SELECT * FROM professional_appointments
          WHERE professional_id = ${identity.userId} OR student_id = ${identity.userId}
          ORDER BY starts_at DESC
        `;
        const professionalIds = [...new Set((rows as Record<string, any>[]).map((row) => row.professional_id))];
        for (const professionalId of professionalIds) await expireStaleRequests(sql, professionalId);
        if (professionalIds.length > 0) {
          rows = await sql`
            SELECT * FROM professional_appointments
            WHERE professional_id = ${identity.userId} OR student_id = ${identity.userId}
            ORDER BY starts_at DESC
          `;
        }
        const ids = (rows as Record<string, any>[]).map((row) => row.id);
        const events = ids.length > 0 ? await sql`
          SELECT id, appointment_id, event_type, from_status, to_status, metadata_json, created_at
          FROM professional_appointment_events
          WHERE appointment_id = ANY(${ids})
          ORDER BY created_at
        ` : [];
        const eventsByAppointment = new Map<string, any[]>();
        for (const event of events as Record<string, any>[]) {
          const current = eventsByAppointment.get(event.appointment_id) || [];
          current.push({
            id: event.id,
            eventType: event.event_type,
            fromStatus: event.from_status ?? undefined,
            toStatus: event.to_status ?? undefined,
            metadata: parseJsonObject(event.metadata_json),
            createdAt: event.created_at,
          });
          eventsByAppointment.set(event.appointment_id, current);
        }
        return res.status(200).json((rows as Record<string, any>[]).map((row) => ({
          id: row.id,
          professionalId: row.professional_id,
          studentId: row.student_id,
          appointmentType: row.appointment_type,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          timeZone: row.time_zone,
          durationMinutes: row.duration_minutes,
          status: row.status,
          holdExpiresAt: row.hold_expires_at ?? undefined,
          proposedSlots: parseJsonArray(row.proposed_slots_json),
          neutralTitle: row.neutral_title,
          origin: row.origin,
          events: eventsByAppointment.get(row.id) || [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }

      if (req.method === 'POST') {
        const parsed = professionalAppointmentPostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);
        const registrations = await getApprovedProfessionalRegistrations(sql, parsed.data.professionalId);
        if (!registrationAllowsAppointmentType(registrations, parsed.data.appointmentType)) {
          return res.status(403).json({ error: 'Professional cannot offer this appointment type' });
        }
        const linkId = await getScopedActiveLink(
          sql,
          parsed.data.professionalId,
          identity.userId,
          'scheduling',
          { action: 'write', recordAccess: false },
        );
        if (!linkId) return res.status(403).json({ error: 'Active scheduling consent required' });
        await expireStaleRequests(sql, parsed.data.professionalId);
        const available = await findBookableSlot(
          sql,
          parsed.data.professionalId,
          parsed.data.appointmentType,
          parsed.data.startsAt,
        );
        if (!available) return res.status(409).json({ error: 'Requested slot is no longer available' });
        const id = randomUUID();
        const holdExpiresAt = new Date(Date.now() + (available.rule.requestHoldMinutes ?? 1440) * 60_000);
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_appointments (
              id, professional_id, student_id, link_id, appointment_type, starts_at, ends_at,
              time_zone, duration_minutes, buffer_before_minutes, buffer_after_minutes,
              status, hold_expires_at, origin, neutral_title
            ) VALUES (
              ${id}, ${parsed.data.professionalId}, ${identity.userId}, ${linkId},
              ${parsed.data.appointmentType}, ${available.slot.startsAt}, ${available.slot.endsAt},
              ${parsed.data.timeZone}, ${available.rule.durationMinutes},
              ${available.rule.bufferBeforeMinutes}, ${available.rule.bufferAfterMinutes},
              'requested', ${holdExpiresAt.toISOString()}, 'student_request', 'Atendimento'
            )
          `,
          txn`
            INSERT INTO professional_appointment_events (
              id, appointment_id, actor_user_id, event_type, to_status
            ) VALUES (${randomUUID()}, ${id}, ${identity.userId}, 'appointment.requested', 'requested')
          `,
        ]);
        await sendNotification(sql, {
          recipientUserId: parsed.data.professionalId,
          actorUserId: identity.userId,
          appointmentId: id,
          type: 'appointment.requested',
          body: 'Voce recebeu uma nova solicitacao de atendimento.',
        });
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          subjectUserId: identity.userId,
          action: 'professional_appointment.requested',
          entityType: 'professional_appointment',
          entityId: id,
          metadata: { appointmentType: parsed.data.appointmentType },
        });
        return res.status(201).json({
          id,
          status: 'requested',
          startsAt: available.slot.startsAt,
          endsAt: available.slot.endsAt,
          holdExpiresAt: holdExpiresAt.toISOString(),
        });
      }

      const parsed = professionalAppointmentPutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      const rows = await sql`SELECT * FROM professional_appointments WHERE id = ${parsed.data.appointmentId}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
      let appointment = rows[0] as Record<string, any>;
      const actor = appointment.professional_id === identity.userId
        ? 'professional'
        : appointment.student_id === identity.userId
          ? 'student'
          : undefined;
      if (!actor) return res.status(404).json({ error: 'Appointment not found' });
      if (actor === 'professional') {
        const registrations = await getApprovedProfessionalRegistrations(sql, identity.userId);
        if (!registrationAllowsAppointmentType(registrations, appointment.appointment_type)) {
          return res.status(403).json({ error: 'Approved compatible professional profile required' });
        }
      }
      if (appointment.status === 'requested' && new Date(appointment.hold_expires_at).getTime() <= Date.now()) {
        await expireStaleRequests(sql, appointment.professional_id);
        appointment = { ...appointment, status: 'expired' };
      }
      const nextStatus = transitionFor({
        action: parsed.data.action,
        currentStatus: appointment.status,
        previousStatus: appointment.previous_status,
        actor,
      });
      if (!nextStatus) return res.status(409).json({ error: 'Action is not allowed from the current status' });

      let proposedSlots: string[] | undefined;
      if (parsed.data.action === 'propose_reschedule') {
        proposedSlots = [...new Set(parsed.data.proposedSlots)];
        for (const start of proposedSlots) {
          if (!await findBookableSlot(sql, appointment.professional_id, appointment.appointment_type, start, appointment.id)) {
            return res.status(409).json({ error: 'A proposed slot is no longer available' });
          }
        }
      }

      let acceptedSlot: Awaited<ReturnType<typeof findBookableSlot>>;
      if (parsed.data.action === 'accept_reschedule') {
        const offered = parseJsonArray(appointment.proposed_slots_json);
        if (!offered.includes(parsed.data.acceptedStartsAt)) {
          return res.status(400).json({ error: 'Selected slot was not proposed for this appointment' });
        }
        acceptedSlot = await findBookableSlot(
          sql,
          appointment.professional_id,
          appointment.appointment_type,
          parsed.data.acceptedStartsAt!,
          appointment.id,
        );
        if (!acceptedSlot) return res.status(409).json({ error: 'Selected slot is no longer available' });
      }

      const eventMetadata = {
        ...(parsed.data.message ? { message: parsed.data.message } : {}),
        ...(proposedSlots ? { proposedSlots } : {}),
        ...(acceptedSlot ? {
          previousStartsAt: appointment.starts_at,
          acceptedStartsAt: acceptedSlot.slot.startsAt,
        } : {}),
      };
      const nextHoldExpiresAt = acceptedSlot
        ? new Date(Date.now() + (acceptedSlot.rule.requestHoldMinutes ?? 1440) * 60_000).toISOString()
        : null;
      const transitioned = await sql`
        WITH updated AS (
          UPDATE professional_appointments SET
            status = ${nextStatus},
            previous_status = ${parsed.data.action === 'propose_reschedule' ? appointment.status : null},
            proposed_slots_json = ${proposedSlots ? JSON.stringify(proposedSlots) : null},
            starts_at = ${acceptedSlot?.slot.startsAt ?? appointment.starts_at},
            ends_at = ${acceptedSlot?.slot.endsAt ?? appointment.ends_at},
            time_zone = ${acceptedSlot ? (parsed.data.timeZone ?? appointment.time_zone) : appointment.time_zone},
            duration_minutes = ${acceptedSlot?.rule.durationMinutes ?? appointment.duration_minutes},
            buffer_before_minutes = ${acceptedSlot?.rule.bufferBeforeMinutes ?? appointment.buffer_before_minutes},
            buffer_after_minutes = ${acceptedSlot?.rule.bufferAfterMinutes ?? appointment.buffer_after_minutes},
            hold_expires_at = ${nextStatus === 'requested' ? (nextHoldExpiresAt ?? appointment.hold_expires_at) : null},
            origin = ${acceptedSlot ? 'professional_reschedule' : appointment.origin},
            updated_at = NOW()
          WHERE id = ${appointment.id} AND status = ${appointment.status}
          RETURNING id
        )
        INSERT INTO professional_appointment_events (
          id, appointment_id, actor_user_id, event_type, from_status, to_status, metadata_json
        )
        SELECT ${randomUUID()}, id, ${identity.userId}, ${`appointment.${parsed.data.action}`},
               ${appointment.status}, ${nextStatus},
               ${Object.keys(eventMetadata).length ? JSON.stringify(eventMetadata) : null}
        FROM updated
        RETURNING appointment_id
      `;
      if (transitioned.length === 0) return res.status(409).json({ error: 'Appointment changed concurrently' });
      const recipientUserId = actor === 'professional' ? appointment.student_id : appointment.professional_id;
      await sendNotification(sql, {
        recipientUserId,
        actorUserId: identity.userId,
        appointmentId: appointment.id,
        type: `appointment.${nextStatus}`,
        body: 'O status de um atendimento foi atualizado. Abra a agenda para ver os detalhes.',
      });
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        subjectUserId: appointment.student_id,
        action: `professional_appointment.${parsed.data.action}`,
        entityType: 'professional_appointment',
        entityId: appointment.id,
        metadata: { fromStatus: appointment.status, toStatus: nextStatus },
      });
      return res.status(200).json({ id: appointment.id, status: nextStatus });
    } catch (error) {
      if (isScheduleConflict(error)) {
        return res.status(409).json({ error: 'Appointment conflicts with another active event' });
      }
      console.error('Professional appointments error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
