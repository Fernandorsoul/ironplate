import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RegisterModal } from '../src/components/RegisterModal';
import PublicHomeScreen from '../src/screens/PublicHomeScreen';

const mockRegister = jest.fn();
const mockLogin = jest.fn();

jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ register: mockRegister, login: mockLogin }),
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 1280, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('authentication modals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue(true);
    mockLogin.mockResolvedValue(true);
  });

  it('validates and submits registration inside the modal', async () => {
    await render(
      <RegisterModal
        visible
        onClose={jest.fn()}
        onLogin={jest.fn()}
        onPrivacyPolicy={jest.fn()}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Atleta Teste');
    await fireEvent.changeText(screen.getByLabelText('Email de cadastro'), 'atleta@example.com');
    await fireEvent.changeText(screen.getByLabelText('Senha de cadastro'), 'Senha123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar senha'), 'Senha123');
    await fireEvent.press(screen.getByLabelText('Aceitar Política de Privacidade'));
    await fireEvent.press(screen.getByText('Criar conta'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Atleta Teste', 'atleta@example.com', 'Senha123');
    });
  });

  it('switches from registration to login without navigating to another page', async () => {
    const onLogin = jest.fn();
    await render(
      <RegisterModal
        visible
        onClose={jest.fn()}
        onLogin={onLogin}
        onPrivacyPolicy={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByText('Entrar'));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('shows recent releases and opens registration from the public home', async () => {
    const navigation = {
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    const route = { key: 'public-home', name: 'PublicHome' as const, params: undefined };

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <PublicHomeScreen navigation={navigation as never} route={route as never} />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('NOVIDADES DO IRONPLATE')).toBeTruthy();
    expect(screen.getByText('Dietas esportivas agora passam por validação completa')).toBeTruthy();

    await fireEvent.press(screen.getAllByText('Começar agora')[0]);

    expect(screen.getByText('Crie sua conta')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith('Register');
  });
});
