import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { applyCors } from '../middleware/cors';
import { getSql } from '../middleware/db';
import { generalRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import {
  professionalAvailabilityPostSchema,
  professionalAvailabilityPutSchema,
  professionalAvailabilitySlotsQuerySchema,
  validationError,
} from '../middleware/validation';
import {
  getApprovedProfessionalRegistration,
  getScopedActiveLink,
  registrationAllowsAppointmentType,
} from '../services/professionalAccess';
import { writeAuditLog } from '../services/audit';
import {
  expandBlockouts,
  generateBookableSlots,
  type AvailabilityRuleRecord,
  type BlockoutRecord,
} from '../services/availabilitySlots';

interface AppointmentImpact {
  id: string;
  studentId: string;
  status: 'requested' | 'confirmed';
  startsAt: Date | string;
  endsAt: Date | string;
}

interface ImpactDecision {
  appointmentId: string;
  action: 'keep' | 'decline' | 'cancel' | 'reschedule';
  proposedSlots?: string[];
}

function mapRule(row: Record<string, any>): AvailabilityRuleRecord & { active: boolean; createdAt: unknown; updatedAt: unknown } {
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
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until ?? undefined,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBlockout(row: Record<string, any>, includePrivateReason: boolean): BlockoutRecord & Record<string, unknown> {
  return {
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
    ...(includePrivateReason ? {
      reasonCategory: row.reason_category,
      privateReason: row.private_reason ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } : {}),
  };
}

function blockoutColumns(blockout: any) {
  return {
    recurrence: blockout.recurrence,
    startsAt: blockout.recurrence === 'single' ? blockout.startsAt : null,
    endsAt: blockout.recurrence === 'single' ? blockout.endsAt : null,
    weekday: blockout.recurrence === 'weekly' ? blockout.weekday : null,
    startTime: blockout.recurrence === 'weekly' ? blockout.startTime : null,
    endTime: blockout.recurrence === 'weekly' ? blockout.endTime : null,
    timeZone: blockout.timeZone,
    effectiveFrom: blockout.recurrence === 'weekly' ? blockout.effectiveFrom : null,
    effectiveUntil: blockout.recurrence === 'weekly' ? (blockout.effectiveUntil ?? null) : null,
    reasonCategory: blockout.reasonCategory,
    privateReason: blockout.privateReason ?? null,
  };
}

function publicImpacts(impacts: AppointmentImpact[]) {
  return impacts.map((impact) => ({
    appointmentId: impact.id,
    status: impact.status,
    startsAt: impact.startsAt,
    endsAt: impact.endsAt,
    allowedActions: impact.status === 'requested'
      ? ['keep', 'decline', 'reschedule']
      : ['keep', 'cancel', 'reschedule'],
  }));
}

function validateDecisions(impacts: AppointmentImpact[], decisions: ImpactDecision[]): string | undefined {
  const byId = new Map(decisions.map((decision) => [decision.appointmentId, decision]));
  if (
    byId.size !== decisions.length
    || byId.size !== impacts.length
    || impacts.some((impact) => !byId.has(impact.id))
  ) {
    return 'An explicit decision is required for every impacted appointment';
  }
  for (const impact of impacts) {
    const decision = byId.get(impact.id)!;
    const allowed = impact.status === 'requested'
      ? ['keep', 'decline', 'reschedule']
      : ['keep', 'cancel', 'reschedule'];
    if (!allowed.includes(decision.action)) {
      return `Action ${decision.action} is not allowed for a ${impact.status} appointment`;
    }
  }
  return undefined;
}

async function findImpactedAppointments(sql: any, professionalId: string, blockout: any): Promise<AppointmentImpact[]> {
  const horizonStart = blockout.recurrence === 'single' ? new Date(blockout.startsAt) : new Date();
  const horizonEnd = blockout.recurrence === 'single'
    ? new Date(blockout.endsAt)
    : blockout.effectiveUntil
      ? new Date(new Date(`${blockout.effectiveUntil}T00:00:00.000Z`).getTime() + 2 * 24 * 60 * 60 * 1_000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1_000);
  const rows = await sql`
    SELECT id, student_id, status, starts_at, ends_at
    FROM professional_appointments
    WHERE professional_id = ${professionalId}
      AND (status = 'confirmed' OR (status = 'requested' AND hold_expires_at > NOW()))
      AND starts_at < ${horizonEnd.toISOString()}
      AND ends_at > ${horizonStart.toISOString()}
    ORDER BY starts_at
  `;
  const intervals = expandBlockouts([{
    id: 'candidate',
    ...blockout,
  }], horizonStart, horizonEnd).map((interval) => ({
    start: new Date(interval.startsAt).getTime(),
    end: new Date(interval.endsAt).getTime(),
  }));
  return (rows as Record<string, any>[]).filter((row) => intervals.some((interval) => (
    new Date(row.starts_at).getTime() < interval.end && new Date(row.ends_at).getTime() > interval.start
  ))).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
}

function impactQueries(txn: any, impacts: AppointmentImpact[], decisions: ImpactDecision[], actorId: string) {
  const byId = new Map(decisions.map((decision) => [decision.appointmentId, decision]));
  const queries: unknown[] = [];
  for (const impact of impacts) {
    const decision = byId.get(impact.id)!;
    const nextStatus = decision.action === 'decline'
      ? 'declined'
      : decision.action === 'cancel'
        ? 'cancelled_by_professional'
        : decision.action === 'reschedule'
          ? 'reschedule_proposed'
          : impact.status;
    if (decision.action !== 'keep') {
      queries.push(txn`
        UPDATE professional_appointments
        SET status = ${nextStatus},
            proposed_slots_json = ${decision.action === 'reschedule' ? JSON.stringify(decision.proposedSlots) : null},
            updated_at = NOW()
        WHERE id = ${impact.id} AND professional_id = ${actorId} AND status = ${impact.status}
      `);
      queries.push(txn`
        INSERT INTO professional_notifications (
          id, recipient_user_id, actor_user_id, appointment_id,
          notification_type, title, body
        ) VALUES (
          ${randomUUID()}, ${impact.studentId}, ${actorId}, ${impact.id},
          ${`appointment.${nextStatus}`}, 'Atualizacao de atendimento',
          'O status de um atendimento foi atualizado. Abra a agenda para ver os detalhes.'
        )
      `);
    }
    queries.push(txn`
      INSERT INTO professional_appointment_events (
        id, appointment_id, actor_user_id, event_type, from_status, to_status, metadata_json
      ) VALUES (
        ${randomUUID()}, ${impact.id}, ${actorId}, 'blockout.impact_decided',
        ${impact.status}, ${nextStatus}, ${JSON.stringify({ decision: decision.action })}
      )
    `);
  }
  return queries;
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
      const registration = await getApprovedProfessionalRegistration(sql, identity.userId);
      if (req.method === 'GET' && req.query.mode === 'slots') {
        const parsed = professionalAvailabilitySlotsQuerySchema.safeParse({
          professionalId: req.query.professionalId,
          appointmentType: req.query.appointmentType,
          from: req.query.from,
          to: req.query.to,
        });
        if (!parsed.success) return validationError(res, parsed.error.issues);
        const ownsSchedule = parsed.data.professionalId === identity.userId && Boolean(registration);
        if (!ownsSchedule && !await getScopedActiveLink(
          sql,
          parsed.data.professionalId,
          identity.userId,
          'scheduling',
        )) return res.status(403).json({ error: 'Active scheduling consent required' });

        const [ruleRows, blockoutRows, appointmentRows] = await Promise.all([
          sql`
            SELECT * FROM professional_availability_rules
            WHERE professional_id = ${parsed.data.professionalId}
              AND appointment_type = ${parsed.data.appointmentType}
              AND active = TRUE
          `,
          sql`
            SELECT * FROM professional_schedule_blockouts
            WHERE professional_id = ${parsed.data.professionalId} AND status = 'active'
          `,
          sql`
            SELECT starts_at, ends_at, buffer_before_minutes, buffer_after_minutes
            FROM professional_appointments
            WHERE professional_id = ${parsed.data.professionalId}
              AND starts_at < ${parsed.data.to}
              AND ends_at > ${parsed.data.from}
              AND (
                status IN ('confirmed', 'reschedule_proposed')
                OR (status = 'requested' AND hold_expires_at > NOW())
              )
          `,
        ]);
        const slots = generateBookableSlots({
          rules: (ruleRows as Record<string, any>[]).map(mapRule),
          blockouts: (blockoutRows as Record<string, any>[]).map((row) => mapBlockout(row, false)) as unknown as BlockoutRecord[],
          appointments: (appointmentRows as Record<string, any>[]).map((row) => ({
            startsAt: row.starts_at,
            endsAt: row.ends_at,
            bufferBeforeMinutes: row.buffer_before_minutes,
            bufferAfterMinutes: row.buffer_after_minutes,
          })),
          appointmentType: parsed.data.appointmentType,
          rangeStart: new Date(parsed.data.from),
          rangeEnd: new Date(parsed.data.to),
        });
        return res.status(200).json(slots);
      }

      if (!registration) return res.status(403).json({ error: 'Approved professional profile required' });
      if (req.method === 'GET') {
        const [rules, blockouts] = await Promise.all([
          sql`SELECT * FROM professional_availability_rules WHERE professional_id = ${identity.userId} ORDER BY weekday, start_time`,
          sql`SELECT * FROM professional_schedule_blockouts WHERE professional_id = ${identity.userId} ORDER BY created_at DESC`,
        ]);
        return res.status(200).json({
          rules: (rules as Record<string, any>[]).map(mapRule),
          blockouts: (blockouts as Record<string, any>[]).map((row) => mapBlockout(row, true)),
        });
      }

      if (req.method === 'POST') {
        const parsed = professionalAvailabilityPostSchema.safeParse(req.body);
        if (!parsed.success) return validationError(res, parsed.error.issues);
        if (parsed.data.resource === 'rule') {
          const rule = parsed.data.rule;
          if (!registrationAllowsAppointmentType(registration, rule.appointmentType)) {
            return res.status(403).json({ error: 'Professional registration does not allow this appointment type' });
          }
          const id = randomUUID();
          await sql`
            INSERT INTO professional_availability_rules (
              id, professional_id, appointment_type, weekday, start_time, end_time, time_zone,
              duration_minutes, slot_interval_minutes, buffer_before_minutes, buffer_after_minutes,
              minimum_notice_minutes, maximum_booking_days, effective_from, effective_until
            ) VALUES (
              ${id}, ${identity.userId}, ${rule.appointmentType}, ${rule.weekday}, ${rule.startTime},
              ${rule.endTime}, ${rule.timeZone}, ${rule.durationMinutes}, ${rule.slotIntervalMinutes},
              ${rule.bufferBeforeMinutes}, ${rule.bufferAfterMinutes}, ${rule.minimumNoticeMinutes},
              ${rule.maximumBookingDays}, ${rule.effectiveFrom}, ${rule.effectiveUntil ?? null}
            )
          `;
          await writeAuditLog(sql, {
            actorUserId: identity.userId,
            action: 'professional_availability_rule.created',
            entityType: 'professional_availability_rule',
            entityId: id,
          });
          return res.status(201).json({ id, active: true });
        }

        if (parsed.data.resource !== 'blockout') return;
        const blockoutRequest = parsed.data;
        const impacts = await findImpactedAppointments(sql, identity.userId, blockoutRequest.blockout);
        if (blockoutRequest.preview) return res.status(200).json({ impacts: publicImpacts(impacts) });
        const decisionError = validateDecisions(impacts, blockoutRequest.impactDecisions);
        if (decisionError) return res.status(409).json({ error: decisionError, impacts: publicImpacts(impacts) });
        const id = randomUUID();
        const values = blockoutColumns(blockoutRequest.blockout);
        await sql.transaction((txn: any) => [
          txn`
            INSERT INTO professional_schedule_blockouts (
              id, professional_id, recurrence, starts_at, ends_at, weekday, start_time, end_time,
              time_zone, effective_from, effective_until, reason_category, private_reason
            ) VALUES (
              ${id}, ${identity.userId}, ${values.recurrence}, ${values.startsAt}, ${values.endsAt},
              ${values.weekday}, ${values.startTime}, ${values.endTime}, ${values.timeZone},
              ${values.effectiveFrom}, ${values.effectiveUntil}, ${values.reasonCategory}, ${values.privateReason}
            )
          `,
          ...impactQueries(txn, impacts, blockoutRequest.impactDecisions, identity.userId),
        ]);
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          action: 'professional_schedule_blockout.created',
          entityType: 'professional_schedule_blockout',
          entityId: id,
          metadata: { recurrence: values.recurrence, impactedAppointments: impacts.length },
        });
        return res.status(201).json({ id, status: 'active', impactedAppointments: impacts.length });
      }

      const parsed = professionalAvailabilityPutSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, parsed.error.issues);
      if (parsed.data.resource === 'rule') {
        const rows = await sql`
          SELECT id FROM professional_availability_rules
          WHERE id = ${parsed.data.ruleId} AND professional_id = ${identity.userId}
        `;
        if (rows.length === 0) return res.status(404).json({ error: 'Availability rule not found' });
        if (parsed.data.action === 'update') {
          const rule = parsed.data.rule!;
          if (!registrationAllowsAppointmentType(registration, rule.appointmentType)) {
            return res.status(403).json({ error: 'Professional registration does not allow this appointment type' });
          }
          await sql`
            UPDATE professional_availability_rules SET
              appointment_type = ${rule.appointmentType}, weekday = ${rule.weekday},
              start_time = ${rule.startTime}, end_time = ${rule.endTime}, time_zone = ${rule.timeZone},
              duration_minutes = ${rule.durationMinutes}, slot_interval_minutes = ${rule.slotIntervalMinutes},
              buffer_before_minutes = ${rule.bufferBeforeMinutes}, buffer_after_minutes = ${rule.bufferAfterMinutes},
              minimum_notice_minutes = ${rule.minimumNoticeMinutes}, maximum_booking_days = ${rule.maximumBookingDays},
              effective_from = ${rule.effectiveFrom}, effective_until = ${rule.effectiveUntil ?? null}, updated_at = NOW()
            WHERE id = ${parsed.data.ruleId} AND professional_id = ${identity.userId}
          `;
        } else {
          await sql`
            UPDATE professional_availability_rules SET active = ${parsed.data.action === 'reactivate'}, updated_at = NOW()
            WHERE id = ${parsed.data.ruleId} AND professional_id = ${identity.userId}
          `;
        }
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          action: `professional_availability_rule.${parsed.data.action}`,
          entityType: 'professional_availability_rule',
          entityId: parsed.data.ruleId,
        });
        return res.status(200).json({ id: parsed.data.ruleId, action: parsed.data.action });
      }

      if (parsed.data.resource !== 'blockout') return;
      const blockoutUpdate = parsed.data;
      const existing = await sql`
        SELECT id, recurrence FROM professional_schedule_blockouts
        WHERE id = ${blockoutUpdate.blockoutId} AND professional_id = ${identity.userId}
      `;
      if (existing.length === 0) return res.status(404).json({ error: 'Schedule blockout not found' });
      if (blockoutUpdate.action === 'cancel') {
        await sql`
          UPDATE professional_schedule_blockouts SET status = 'cancelled', updated_at = NOW()
          WHERE id = ${blockoutUpdate.blockoutId} AND professional_id = ${identity.userId}
        `;
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          action: 'professional_schedule_blockout.cancelled',
          entityType: 'professional_schedule_blockout',
          entityId: blockoutUpdate.blockoutId,
        });
        return res.status(200).json({ id: blockoutUpdate.blockoutId, status: 'cancelled' });
      }
      if (blockoutUpdate.action === 'cancel_future') {
        if (existing[0].recurrence !== 'weekly') {
          return res.status(400).json({ error: 'Only recurring blockouts support cancel_future' });
        }
        await sql`
          UPDATE professional_schedule_blockouts
          SET effective_until = ${blockoutUpdate.effectiveUntil}, updated_at = NOW()
          WHERE id = ${blockoutUpdate.blockoutId} AND professional_id = ${identity.userId}
        `;
        await writeAuditLog(sql, {
          actorUserId: identity.userId,
          action: 'professional_schedule_blockout.future_cancelled',
          entityType: 'professional_schedule_blockout',
          entityId: blockoutUpdate.blockoutId,
          metadata: { effectiveUntil: blockoutUpdate.effectiveUntil },
        });
        return res.status(200).json({ id: blockoutUpdate.blockoutId, status: 'active' });
      }

      const blockout = blockoutUpdate.blockout!;
      const impacts = await findImpactedAppointments(sql, identity.userId, blockout);
      if (blockoutUpdate.preview) return res.status(200).json({ impacts: publicImpacts(impacts) });
      const decisionError = validateDecisions(impacts, blockoutUpdate.impactDecisions);
      if (decisionError) return res.status(409).json({ error: decisionError, impacts: publicImpacts(impacts) });
      const values = blockoutColumns(blockout);
      await sql.transaction((txn: any) => [
        txn`
          UPDATE professional_schedule_blockouts SET
            recurrence = ${values.recurrence}, starts_at = ${values.startsAt}, ends_at = ${values.endsAt},
            weekday = ${values.weekday}, start_time = ${values.startTime}, end_time = ${values.endTime},
            time_zone = ${values.timeZone}, effective_from = ${values.effectiveFrom},
            effective_until = ${values.effectiveUntil}, reason_category = ${values.reasonCategory},
            private_reason = ${values.privateReason}, status = 'active', updated_at = NOW()
          WHERE id = ${blockoutUpdate.blockoutId} AND professional_id = ${identity.userId}
        `,
        ...impactQueries(txn, impacts, blockoutUpdate.impactDecisions, identity.userId),
      ]);
      await writeAuditLog(sql, {
        actorUserId: identity.userId,
        action: 'professional_schedule_blockout.updated',
        entityType: 'professional_schedule_blockout',
        entityId: blockoutUpdate.blockoutId,
        metadata: { recurrence: values.recurrence, impactedAppointments: impacts.length },
      });
      return res.status(200).json({ id: blockoutUpdate.blockoutId, impactedAppointments: impacts.length });
    } catch (error) {
      console.error('Professional availability error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
