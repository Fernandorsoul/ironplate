import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from '../types/navigation';

const configuredAppUrl = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');

export const passwordResetLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'ironplate://',
    configuredAppUrl || 'https://ironplate.vercel.app',
  ],
  config: {
    screens: {
      ForgotPassword: {
        path: 'reset-password',
        parse: {
          token: (value: string) => value.trim(),
        },
      },
    },
  },
};
