import fs from 'fs';
import path from 'path';

describe('professional availability migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '0006_careful_skrulls.sql'),
    'utf8',
  );

  it('prevents appointment overlap at the database level with an immutable range', () => {
    expect(migration).toContain('CREATE EXTENSION IF NOT EXISTS btree_gist');
    expect(migration).toContain('professional_appointments_no_overlap');
    expect(migration).toContain('EXCLUDE USING gist');
    // 42P17: timestamptz +/- interval is STABLE and illegal in gist expressions.
    expect(migration).toContain('tstzrange(starts_at, ends_at');
    expect(migration).not.toContain('make_interval(mins => buffer_before_minutes)');
    expect(migration).toContain("status IN ('requested', 'confirmed', 'reschedule_proposed')");
  });

  it('enforces rule, blockout, appointment type, and interval integrity', () => {
    expect(migration).toContain('professional_availability_rules_weekday_check');
    expect(migration).toContain('professional_availability_rules_time_check');
    expect(migration).toContain('professional_schedule_blockouts_shape_check');
    expect(migration).toContain('professional_appointments_interval_check');
    expect(migration).toContain('professional_appointments_type_check');
    expect(migration).toContain('professional_appointments_status_check');
  });

  it('adds configurable holds and reschedule provenance incrementally', () => {
    const appointmentMigration = fs.readFileSync(
      path.join(process.cwd(), 'migrations', '0007_clear_typhoid_mary.sql'),
      'utf8',
    );
    expect(appointmentMigration).toContain('request_hold_minutes');
    expect(appointmentMigration).toContain('professional_availability_rules_hold_check');
    expect(appointmentMigration).toContain('previous_status');
    expect(appointmentMigration).toContain('professional_appointments_origin_check');
  });
});
