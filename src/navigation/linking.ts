import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from '../types/navigation';

const configuredAppUrl = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');

/** Prefer fragment tokens (#token=) so secrets stay out of HTTP access logs. */
function tokenFromUrl(url: string): string | null {
  const hash = url.split('#')[1] || '';
  const match = /(?:^|&)token=([^&]+)/.exec(hash);
  return match ? decodeURIComponent(match[1]) : null;
}

export const passwordResetLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'ironplate://',
    configuredAppUrl || 'https://ironplate-phi.vercel.app',
  ],
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (!url) return url;
    const fragmentToken = tokenFromUrl(url);
    if (fragmentToken && url.includes('reset-password')) {
      return `${url.split('#')[0]}?token=${encodeURIComponent(fragmentToken)}`;
    }
    return url;
  },
  subscribe(listener) {
    const onReceive = ({ url }: { url: string }) => {
      const fragmentToken = tokenFromUrl(url);
      if (fragmentToken && url.includes('reset-password')) {
        listener(`${url.split('#')[0]}?token=${encodeURIComponent(fragmentToken)}`);
        return;
      }
      listener(url);
    };
    const subscription = Linking.addEventListener('url', onReceive);
    return () => subscription.remove();
  },
  config: {
    screens: {
      PublicHome: {
        path: '',
      },
      ForgotPassword: {
        path: 'reset-password',
        parse: {
          token: (value: string) => value.trim(),
        },
      },
      ProfessionalConsent: {
        path: 'professional-invite/:token?',
        parse: {
          token: (value: string) => value.trim(),
        },
      },
    },
  },
};
