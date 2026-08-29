import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProfileAvatar } from '../src/components/ProfileAvatar';

describe('ProfileAvatar', () => {
  it('renders the profile photo when a URI is available', async () => {
    const photoUri = 'data:image/jpeg;base64,cGhvdG8=';
    const { getByTestId, queryByTestId } = await render(
      <ProfileAvatar name="Atleta" photoUri={photoUri} />,
    );

    expect(getByTestId('profile-avatar-image').props.source).toEqual({ uri: photoUri });
    expect(queryByTestId('profile-avatar-fallback')).toBeNull();
  });

  it('uses the profile initial when there is no photo', async () => {
    const { getByTestId } = await render(<ProfileAvatar name="Atleta" />);

    expect(getByTestId('profile-avatar-fallback')).toHaveTextContent('A');
  });

  it('falls back to the profile initial when loading the photo fails', async () => {
    const { getByTestId } = await render(
      <ProfileAvatar name="Atleta" photoUri="data:image/jpeg;base64,cGhvdG8=" />,
    );

    await fireEvent(getByTestId('profile-avatar-image'), 'error');

    expect(getByTestId('profile-avatar-fallback')).toHaveTextContent('A');
  });
});
