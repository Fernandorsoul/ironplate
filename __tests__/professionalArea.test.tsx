import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockGetProfessionalProfile = jest.fn();
const mockCreateProfessionalInvitation = jest.fn();
const mockSearchAdministrativeCpf = jest.fn();

jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({
    profile: {
      roles: ['nutritionist', 'fitness_professional'],
    },
  }),
}));
jest.mock('../src/services/database', () => ({
  getProfessionalProfile: (...args: unknown[]) => mockGetProfessionalProfile(...args),
  createProfessionalInvitation: (...args: unknown[]) => mockCreateProfessionalInvitation(...args),
  searchAdministrativeCpf: (...args: unknown[]) => mockSearchAdministrativeCpf(...args),
}));
jest.mock('react-native-qrcode-svg', () => ({
  __esModule: true,
  default: ({ value }: { value: string }) => {
    const { Text } = require('react-native');
    return <Text testID="invitation-qr">{value}</Text>;
  },
}));

import ProfessionalAreaScreen from '../src/screens/ProfessionalAreaScreen';

describe('professional area permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows only credentials that are both verified and active', async () => {
    mockGetProfessionalProfile.mockResolvedValue({
      id: 'profile-1',
      displayName: 'Ana Silva',
      status: 'approved',
      roles: [],
      createdAt: '2026-09-08T10:00:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
      credentials: [
        {
          id: 'credential-crn',
          professionalRole: 'nutritionist',
          registrationType: 'CRN',
          registrationNumber: '12345',
          registrationRegion: 'SP',
          status: 'verified',
          createdAt: '2026-09-08T10:00:00.000Z',
          updatedAt: '2026-09-08T10:00:00.000Z',
        },
        {
          id: 'credential-cref',
          professionalRole: 'fitness_professional',
          registrationType: 'CREF',
          registrationNumber: '67890-G',
          registrationRegion: 'SP',
          status: 'pending',
          createdAt: '2026-09-08T10:00:00.000Z',
          updatedAt: '2026-09-08T10:00:00.000Z',
        },
      ],
    });

    await render(<ProfessionalAreaScreen />);

    await waitFor(() => expect(screen.getByText('CRN 12345 / SP')).toBeTruthy());
    expect(screen.queryByText('CREF 67890-G / SP')).toBeNull();
    expect(screen.getAllByText('VERIFICADO')).toHaveLength(1);
    expect(screen.getByText('Sua area pessoal permanece independente')).toBeTruthy();
  });

  it('creates a local QR invitation with the selected granular scopes', async () => {
    mockGetProfessionalProfile.mockResolvedValue({
      id: 'profile-1',
      displayName: 'Ana Silva',
      status: 'approved',
      roles: [],
      createdAt: '2026-09-08T10:00:00.000Z',
      updatedAt: '2026-09-08T10:00:00.000Z',
      credentials: [{
        id: 'credential-crn',
        professionalRole: 'nutritionist',
        registrationType: 'CRN',
        registrationNumber: '12345',
        registrationRegion: 'SP',
        status: 'verified',
        createdAt: '2026-09-08T10:00:00.000Z',
        updatedAt: '2026-09-08T10:00:00.000Z',
      }],
    });
    mockCreateProfessionalInvitation.mockResolvedValue({
      id: 'invitation-1',
      token: 'a'.repeat(64),
      invitationUrl: `https://ironplate.test/professional-invite/${'a'.repeat(64)}`,
      qrPayload: `https://ironplate.test/professional-invite/${'a'.repeat(64)}`,
      expiresAt: '2026-09-11T10:00:00.000Z',
    });

    await render(<ProfessionalAreaScreen />);

    await waitFor(() => expect(screen.getByText('Criar convite seguro')).toBeTruthy());
    const weightScope = screen.getByRole('checkbox', { name: 'Peso' });
    fireEvent.press(weightScope);
    await waitFor(() => expect(weightScope.props.accessibilityState).toEqual({ checked: true }));
    await act(async () => {
      fireEvent.press(screen.getByText('Gerar link e QR'));
    });

    await waitFor(() => expect(mockCreateProfessionalInvitation).toHaveBeenCalledWith({
      purpose: 'Acompanhamento profissional individual',
      scopes: ['basic_profile', 'weight'],
      professionalRoles: ['nutritionist'],
      consentVersion: '2026-09',
      expiresInHours: 72,
      durationDays: 365,
    }));
    expect(screen.getByTestId('invitation-qr').props.children).toContain('/professional-invite/');
    expect(screen.getByText('Compartilhar convite')).toBeTruthy();
  });
});
