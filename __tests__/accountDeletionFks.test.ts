import fs from 'fs';
import path from 'path';

describe('account deletion foreign keys', () => {
  const migration = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '0012_round_leopardon.sql'),
    'utf8',
  );

  it('allows deleting a user who only appears as requested_by or created_by', () => {
    expect(migration).toContain(
      'ALTER COLUMN "requested_by" DROP NOT NULL',
    );
    expect(migration).toContain(
      'ALTER COLUMN "created_by" DROP NOT NULL',
    );
    expect(migration).toMatch(/"requested_by"\) REFERENCES "public"\."users"\("id"\) ON DELETE set null/);
    expect(migration).toMatch(
      /"created_by"\) REFERENCES "public"\."users"\("id"\) ON DELETE set null/,
    );
  });

  it('cascades training executions when a plan version is removed', () => {
    expect(migration).toMatch(
      /"plan_version_id"\) REFERENCES "public"\."professional_training_plan_versions"\("id"\) ON DELETE cascade/,
    );
  });
});
