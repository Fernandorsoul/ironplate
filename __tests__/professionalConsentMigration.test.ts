import fs from 'fs';
import path from 'path';

describe('granular consent migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '0009_aspiring_calypso.sql'),
    'utf8',
  );

  it('creates hashed, expiring, one-time invitations', () => {
    expect(migration).toContain('professional_link_invitations');
    expect(migration).toContain('token_hash');
    expect(migration).toContain('professional_link_invitations_token_unique');
    expect(migration).toContain("status IN ('issued', 'accepted', 'declined', 'expired')");
  });

  it('turns consent into ordered snapshots and expands legacy scopes', () => {
    expect(migration).toContain('DROP INDEX "consent_records_link_unique"');
    expect(migration).toContain('consent_records_link_created_idx');
    expect(migration).toContain("'nutrition_data', 'meals_adherence', 'meal_plans', 'weight', 'body_measurements'");
    expect(migration).toContain("'prescribed_training', 'training_execution', 'weight', 'body_measurements'");
  });

  it('backfills link provenance and constrains lifecycle states', () => {
    expect(migration).toContain("origin = 'legacy_direct'");
    expect(migration).toContain("status = CASE WHEN l.status = 'pending' THEN 'invited'");
    expect(migration).toContain('professional_student_links_status_check');
    expect(migration).toContain('professional_student_links_origin_check');
  });
});
