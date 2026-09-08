import fs from 'fs';
import path from 'path';

describe('cumulative professional roles migration', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '0008_early_emma_frost.sql'),
    'utf8',
  );

  it('backfills every existing user as an active student without replacing legacy data', () => {
    expect(migration).toContain("SELECT 'role-' || md5(id || ':student'), id, 'student', 'active'");
    expect(migration).toContain('ON CONFLICT (user_id, role) DO NOTHING');
  });

  it('backfills internal admins and independent CRN/CREF professional roles', () => {
    expect(migration).toContain("id, 'admin_verifier', 'active'");
    expect(migration).toContain("WHEN UPPER(p.registration_type) = 'CRN' THEN 'nutritionist'");
    expect(migration).toContain("ELSE 'fitness_professional'");
    expect(migration).toContain("WHEN p.status = 'approved' THEN 'verified'");
  });

  it('constrains client-visible roles, credential states, and council compatibility', () => {
    expect(migration).toContain('user_roles_role_check');
    expect(migration).toContain('professional_credentials_status_check');
    expect(migration).toContain("professional_role = 'nutritionist' AND registration_type = 'CRN'");
    expect(migration).toContain("professional_role = 'fitness_professional' AND registration_type = 'CREF'");
  });
});
