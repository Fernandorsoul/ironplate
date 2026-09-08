import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockGetProfessionalProfile = jest.fn();

jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({
    profile: {
      roles: ['nutritionist', 'fitness_professional'],
    },
  }),
}));
jest.mock('../src/services/database', () => ({
  getProfessionalProfile: (...args: unknown[]) => mockGetProfessionalProfile(...args),
}));

import ProfessionalAreaScreen from '../src/screens/ProfessionalAreaScreen';

describe('professional area permissions', () => {
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
});
