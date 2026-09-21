import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ReleaseNewsCard = {
  badge: string;
  date: string;
  icon: IconName;
  title: string;
  description: string;
  highlights: string[];
  featured?: boolean;
  version?: string;
  url?: string;
};
