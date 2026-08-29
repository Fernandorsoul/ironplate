import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/context/AppContext';
import { COLORS } from './src/constants/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CollapsibleSideBar } from './src/components/CollapsibleSideBar';
import { RootStackParamList, TabParamList } from './src/types/navigation';
import { passwordResetLinking } from './src/navigation/linking';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AddMealScreen from './src/screens/AddMealScreen';
import AddWorkoutScreen from './src/screens/AddWorkoutScreen';
import WeightScreen from './src/screens/WeightScreen';
import MealPlanScreen from './src/screens/MealPlanScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AddFoodScreen from './src/screens/AddFoodScreen';

import ProfileScreen from './src/screens/ProfileScreen';
import EditMealPlanScreen from './src/screens/EditMealPlanScreen';
import WeeklySummaryScreen from './src/screens/WeeklySummaryScreen';
import EditMealScreen from './src/screens/EditMealScreen';

import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import DietAnalysisScreen from './src/screens/DietAnalysisScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import BodyMeasurementsScreen from './src/screens/BodyMeasurementsScreen';
import EvolutionScreen from './src/screens/EvolutionScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import PublicHomeScreen from './src/screens/PublicHomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function HomeTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CollapsibleSideBar {...props} />}
      screenOptions={{
        tabBarPosition: 'left',
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderRightColor: COLORS.border,
          width: 92,
          paddingHorizontal: 6,
        },
        tabBarItemStyle: { paddingVertical: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name={'grid-outline'} size={size} color={color} />,
          tabBarLabel: 'Resumo',
        }}
      />
      <Tab.Screen
        name="MealPlan"
        component={MealPlanScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name={'restaurant-outline'} size={size} color={color} />,
          tabBarLabel: 'Cardápio',
        }}
      />
      <Tab.Screen
        name="Weight"
        component={WeightScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name={'scale-outline'} size={size} color={color} />,
          tabBarLabel: 'Peso',
        }}
      />
      <Tab.Screen
        name={'Workout'}
        component={AddWorkoutScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name={'barbell-outline'} size={size} color={color} />,
          tabBarLabel: 'Treino',
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isOnboarded, isLoading } = useApp();

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Public presentation and account screens
        <>
          <Stack.Screen name="PublicHome" component={PublicHomeScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: 'Política de Privacidade' }} />
        </>
      ) : !isOnboarded ? (
        // Onboarding screen
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="BodyMeasurements" component={BodyMeasurementsScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        // Main app screens
        <>
          <Stack.Screen name="MainTabs" component={HomeTabs} />
          <Stack.Screen name="AddMeal" component={AddMealScreen} />
          <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} />
          <Stack.Screen name="AddFood" component={AddFoodScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditMealPlan" component={EditMealPlanScreen} />
          <Stack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
          <Stack.Screen name="EditMeal" component={EditMealScreen} />
          <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
          <Stack.Screen name="DietAnalysis" component={DietAnalysisScreen} />
          <Stack.Screen name="BodyMeasurements" component={BodyMeasurementsScreen} />
          <Stack.Screen name="Evolution" component={EvolutionScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: true, title: 'Política de Privacidade' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <NavigationContainer linking={passwordResetLinking}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </ErrorBoundary>
  );
}
