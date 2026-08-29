import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Tab Navigator
export type TabParamList = {
  Home: undefined;
  Weight: undefined;
  Workout: undefined;
  MealPlan: undefined;
};

// Stack Navigator
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: { token?: string } | undefined;
  PrivacyPolicy: undefined;
  Onboarding: undefined;
  BodyMeasurements: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  AddMeal: undefined;
  AddWorkout: undefined;
  AddFood: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EditMealPlan: { plan: import('./index').MealPlan };
  WeeklySummary: undefined;
  EditMeal: { meal: import('./index').Meal; logDate: string };
  WorkoutDetail: { workout: import('./index').Workout };
  DietAnalysis: { plan: import('./index').MealPlan };
  Evolution: undefined;
};

// Screen props
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Navigation prop type for use in components
export type NavigationProp<T extends keyof RootStackParamList> = RootStackScreenProps<T>['navigation'];
export type RouteProp<T extends keyof RootStackParamList> = RootStackScreenProps<T>['route'];
