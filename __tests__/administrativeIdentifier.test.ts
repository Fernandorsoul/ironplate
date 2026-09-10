const mockAudit = jest.fn();
jest.mock('../api/services/audit', () => ({
  writeAuditLog: (...args: unknown[]) => mockAudit(...args),
}));

import {
  handleAdministrativeIdentifier,
  handleAdministrativeIdentifierSearch,
} from '../api/services/administrativeIdentifier';

const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const cpf = '52998224725';

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

describe('administrative identifier service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_IDENTIFIER_INDEX_KEY = 'index-key-with-at-least-thirty-two-bytes';
    process.env.ADMIN_IDENTIFIER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  it('does not persist a CPF without an active consented link', async () => {
    const sql = jest.fn().mockResolvedValueOnce([]);
    const response = responseMock();
    await handleAdministrativeIdentifier({
      method: 'PUT',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Organizacao administrativa', confirmed: true },
    } as any, response, sql, userId);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('stores only ciphertext, keyed hash and masked output', async () => {
    const sql = jest.fn()
      .mockResolvedValueOnce([{ id: 'link-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();
    await handleAdministrativeIdentifier({
      method: 'PUT',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Organizacao administrativa', confirmed: true },
    } as any, response, sql, userId);
    expect(JSON.stringify(sql.mock.calls)).not.toContain(cpf);
    expect(JSON.stringify(mockAudit.mock.calls)).not.toContain(cpf);
    expect(response.json).toHaveBeenCalledWith({ identifierType: 'cpf', maskedValue: '***.***.***-25' });
  });

  it('returns the same neutral result for a CPF outside the active portfolio', async () => {
    const sql = jest.fn().mockResolvedValueOnce([]);
    const response = responseMock();
    await handleAdministrativeIdentifierSearch({
      method: 'POST',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Conferencia de cadastro' },
    } as any, response, sql, professionalId);
    expect(response.json).toHaveBeenCalledWith({ match: null });
    expect(JSON.stringify(sql.mock.calls)).not.toContain(cpf);
    expect(mockAudit).toHaveBeenCalledWith(sql, expect.objectContaining({
      action: 'administrative_identifier.searched',
      metadata: { identifierType: 'cpf', purpose: 'Conferencia de cadastro', matched: false },
    }));
  });

  it('returns only masked data for a student in the active portfolio', async () => {
    const sql = jest.fn().mockResolvedValueOnce([{
      id: 'identifier-1', user_id: userId, last_four: '4725', name: 'Aluno', link_id: 'link-1',
    }]);
    const response = responseMock();
    await handleAdministrativeIdentifierSearch({
      method: 'POST',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Conferencia de cadastro' },
    } as any, response, sql, professionalId);
    expect(response.json).toHaveBeenCalledWith({
      match: { studentId: userId, displayName: 'Aluno', maskedValue: '***.***.***-25' },
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(cpf);
  });

  it('removes ciphertext and lookup index together', async () => {
    const sql = jest.fn().mockResolvedValueOnce([{ id: 'identifier-1' }]);
    const response = responseMock();
    await handleAdministrativeIdentifier({ method: 'DELETE' } as any, response, sql, userId);
    expect((sql.mock.calls[0][0] as TemplateStringsArray).join(' ')).toContain('DELETE FROM administrative_identifiers');
    expect(response.json).toHaveBeenCalledWith({ removed: true });
  });

  it('stores only the masked suffix digits, not four raw CPF digits', async () => {
    const sql = jest.fn()
      .mockResolvedValueOnce([{ id: 'link-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();
    await handleAdministrativeIdentifier({
      method: 'PUT',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Organizacao administrativa', confirmed: true },
    } as any, response, sql, userId);
    const bound = sql.mock.calls.flatMap(call => call.slice(1)).map(String);
    expect(bound).toContain('25');
    expect(bound).not.toContain('4725');
    expect(bound).not.toContain(cpf);
    expect(response.json).toHaveBeenCalledWith({ identifierType: 'cpf', maskedValue: '***.***.***-25' });
  });

  it('returns a non-informative conflict when the lookup hash is already taken', async () => {
    const conflict = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
    });
    const sql = jest.fn()
      .mockResolvedValueOnce([{ id: 'link-1' }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(conflict);
    const response = responseMock();
    await handleAdministrativeIdentifier({
      method: 'PUT',
      body: { identifierType: 'cpf', value: cpf, purpose: 'Organizacao administrativa', confirmed: true },
    } as any, response, sql, userId);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ error: 'Unable to save administrative identifier' });
    const payload = JSON.stringify(response.json.mock.calls);
    expect(payload).not.toMatch(/unavailable|exists|another|taken|duplicate/i);
  });
});
