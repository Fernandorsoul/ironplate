import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { COLORS } from './src/constants/theme';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏠</Text>,
          tabBarLabel: 'Início',
        }}
      />
      <Tab.Screen
        name="MealPlan"
        component={MealPlanScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📋</Text>,
          tabBarLabel: 'Planos',
        }}
      />
      <Tab.Screen
        name="Weight"
        component={WeightScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚖️</Text>,
          tabBarLabel: 'Peso',
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isOnboarded, isLoading } = useApp();

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
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
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
