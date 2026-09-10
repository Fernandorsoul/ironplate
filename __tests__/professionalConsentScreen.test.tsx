import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockGetInvitation = jest.fn();
const mockGetLinks = jest.fn();
const mockDecideInvitation = jest.fn();
const mockUpdateConsent = jest.fn();
const mockGetIdentifiers = jest.fn();
const mockUpdateCpf = jest.fn();
const mockRemoveCpf = jest.fn();

jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isAuthenticated: true }),
}));
jest.mock('../src/services/database', () => ({
  getProfessionalInvitation: (...args: unknown[]) => mockGetInvitation(...args),
  getProfessionalLinks: (...args: unknown[]) => mockGetLinks(...args),
  decideProfessionalInvitation: (...args: unknown[]) => mockDecideInvitation(...args),
  updateProfessionalConsent: (...args: unknown[]) => mockUpdateConsent(...args),
  getAdministrativeIdentifiers: (...args: unknown[]) => mockGetIdentifiers(...args),
  updateAdministrativeCpf: (...args: unknown[]) => mockUpdateCpf(...args),
  removeAdministrativeCpf: (...args: unknown[]) => mockRemoveCpf(...args),
}));

import ProfessionalConsentScreen from '../src/screens/ProfessionalConsentScreen';

const token = 'a'.repeat(64);
const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() };

describe('professional consent screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecideInvitation.mockResolvedValue(undefined);
    mockUpdateConsent.mockResolvedValue(undefined);
    mockGetIdentifiers.mockResolvedValue([]);
    mockUpdateCpf.mockResolvedValue({ maskedValue: '***.***.***-25' });
    mockRemoveCpf.mockResolvedValue(undefined);
  });

  it('shows purpose, verified registration and lets the student accept fewer categories', async () => {
    mockGetInvitation.mockResolvedValue({
      professionalId: 'professional-1',
      professionalName: 'Dra. Ana',
      professionalRoles: ['nutritionist'],
      registrations: [{ role: 'nutritionist', type: 'CRN', number: '12345', region: 'SP' }],
      purpose: 'Acompanhamento nutricional',
      scopes: ['meal_plans', 'weight'],
      consentVersion: '2026-09',
      durationDays: 180,
      expiresAt: '2026-09-10T12:00:00.000Z',
      revocationNotice: 'Revogacao imediata.',
    });

    await render(<ProfessionalConsentScreen navigation={navigation} route={{ params: { token } }} />);

    await waitFor(() => expect(screen.getByText('Dra. Ana')).toBeTruthy());
    expect(screen.getByText('CRN 12345/SP')).toBeTruthy();
    expect(screen.getByText('Acompanhamento nutricional')).toBeTruthy();
    await fireEvent.press(screen.getByText('Peso'));
    await fireEvent.press(screen.getByText('Aceitar categorias selecionadas'));

    await waitFor(() => expect(mockDecideInvitation).toHaveBeenCalledWith(
      token,
      'accept',
      ['meal_plans'],
    ));
  });

  it('lists active professionals and revokes without professional approval', async () => {
    mockGetLinks
      .mockResolvedValueOnce([{
        id: 'link-1',
        professionalId: 'professional-1',
        studentId: 'student-1',
        viewerRole: 'student',
        professionalName: 'Dra. Ana',
        professionalRoles: ['nutritionist'],
        registrations: ['CRN 12345/SP'],
        status: 'active',
        purpose: 'Acompanhamento',
        requestedScopes: ['meal_plans', 'weight'],
        grantedScopes: ['weight'],
        consentStatus: 'granted',
        consentVersion: '2026-09',
        lastChangedAt: '2026-09-08T12:00:00.000Z',
      }])
      .mockResolvedValueOnce([]);

    await render(<ProfessionalConsentScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Dra. Ana')).toBeTruthy());
    await fireEvent.press(screen.getByText('Revogar acesso agora'));
    await waitFor(() => expect(mockUpdateConsent).toHaveBeenCalledWith('link-1', 'revoke', undefined));
  });
});
