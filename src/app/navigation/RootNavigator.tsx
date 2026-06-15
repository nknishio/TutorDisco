/**
 * Root navigator — a native stack for the tutoring workflow. Header is themed.
 * Linking config gives every screen a real URL on web (refresh-safe, shareable).
 */
import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../shared/theme';
import { StudentsListScreen } from '../../features/students/screens/StudentsListScreen';
import { StudentDetailScreen } from '../../features/students/screens/StudentDetailScreen';
import { SessionDetailScreen } from '../../features/sessions/screens/SessionDetailScreen';
import { PaymentsScreen } from '../../features/payments/screens/PaymentsScreen';
import { RevenueDashboardScreen } from '../../features/payments/screens/RevenueDashboardScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  config: {
    screens: {
      StudentsList: '',
      StudentDetail: 'students/:studentId',
      SessionDetail: 'sessions/:sessionId',
      Payments: 'payments',
      RevenueDashboard: 'revenue',
    },
  },
};

export const RootNavigator = () => {
  const theme = useTheme();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="StudentsList"
          component={StudentsListScreen}
          options={{ title: 'Students' }}
        />
        <Stack.Screen
          name="StudentDetail"
          component={StudentDetailScreen}
          options={{ title: 'Student' }}
        />
        <Stack.Screen
          name="SessionDetail"
          component={SessionDetailScreen}
          options={{ title: 'Session' }}
        />
        <Stack.Screen
          name="RevenueDashboard"
          component={RevenueDashboardScreen}
          options={{ title: 'Revenue' }}
        />
        <Stack.Screen
          name="Payments"
          component={PaymentsScreen}
          options={{ title: 'Payments' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
