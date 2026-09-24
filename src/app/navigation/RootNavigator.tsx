/**
 * Root navigator — the app shell. A tab navigator holds the four top-level areas;
 * Students and Settings each nest a native stack for their drill-down screens.
 *
 * - Phones/tablets: bottom tab bar (icon + label).
 * - Wide web (≥ 1024): the same tabs rendered as a left sidebar.
 *
 * Linking gives every screen a real URL on web (refresh-safe, shareable). The URLs
 * are unchanged from the single-stack era; `initialRouteName` on each nested stack
 * means a deep link to a detail screen still has its list underneath for Back.
 */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type LinkingOptions,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../shared/theme';
import { iconStroke, type Theme } from '../../shared/theme/theme';
import { useResponsive } from '../../shared/responsive';
import { StudentsListScreen } from '../../features/students/screens/StudentsListScreen';
import { StudentDetailScreen } from '../../features/students/screens/StudentDetailScreen';
import { SessionDetailScreen } from '../../features/sessions/screens/SessionDetailScreen';
import { PaymentsScreen } from '../../features/payments/screens/PaymentsScreen';
import { RevenueDashboardScreen } from '../../features/payments/screens/RevenueDashboardScreen';
import { TemplatesScreen } from '../../features/templates/screens/TemplatesScreen';
import { SettingsScreen } from '../../features/settings/screens/SettingsScreen';
import { Sidebar } from './Sidebar';
import { TAB_META } from './tabMeta';
import type { MainTabParamList, SettingsStackParamList, StudentsStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const StudentsStack = createNativeStackNavigator<StudentsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const linking: LinkingOptions<MainTabParamList> = {
  prefixes: [],
  config: {
    screens: {
      StudentsTab: {
        initialRouteName: 'StudentsList',
        screens: {
          StudentsList: '',
          StudentDetail: 'students/:studentId',
          SessionDetail: 'sessions/:sessionId',
        },
      },
      Payments: 'payments',
      RevenueDashboard: 'revenue',
      SettingsTab: {
        initialRouteName: 'Settings',
        screens: {
          Settings: 'settings',
          Templates: 'templates',
        },
      },
    },
  },
};

/** Header shared by stack screens and tab screens: paper background, no rule. */
const headerOptions = (theme: Theme) => ({
  headerStyle: { backgroundColor: theme.colors.background },
  headerTintColor: theme.colors.text,
  headerTitleStyle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.sansSemibold,
    fontSize: theme.typography.fontSize.lg,
  },
  headerShadowVisible: false,
});

const StudentsNavigator = () => {
  const theme = useTheme();
  const options: NativeStackNavigationOptions = {
    ...headerOptions(theme),
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: theme.colors.background },
  };
  return (
    <StudentsStack.Navigator initialRouteName="StudentsList" screenOptions={options}>
      <StudentsStack.Screen name="StudentsList" component={StudentsListScreen} options={{ title: 'Students' }} />
      <StudentsStack.Screen name="StudentDetail" component={StudentDetailScreen} options={{ title: 'Student' }} />
      <StudentsStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
    </StudentsStack.Navigator>
  );
};

const SettingsNavigator = () => {
  const theme = useTheme();
  const options: NativeStackNavigationOptions = {
    ...headerOptions(theme),
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: theme.colors.background },
  };
  return (
    <SettingsStack.Navigator initialRouteName="Settings" screenOptions={options}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Templates" component={TemplatesScreen} options={{ title: 'Email templates' }} />
    </SettingsStack.Navigator>
  );
};

export const RootNavigator = () => {
  const theme = useTheme();
  const { isExpanded } = useResponsive();
  const insets = useSafeAreaInsets();

  // Keep React Navigation's own surfaces (cards, borders, fonts) on our palette so
  // transitions never flash the library's default white.
  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primaryText,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
      fonts: {
        regular: { fontFamily: theme.typography.fontFamily.sans, fontWeight: '400' },
        medium: { fontFamily: theme.typography.fontFamily.sansMedium, fontWeight: '400' },
        bold: { fontFamily: theme.typography.fontFamily.sansSemibold, fontWeight: '400' },
        heavy: { fontFamily: theme.typography.fontFamily.sansSemibold, fontWeight: '400' },
      },
    };
  }, [theme]);

  return (
    <NavigationContainer
      linking={linking}
      theme={navTheme}
      documentTitle={{ formatter: (options, route) => `${options?.title ?? route?.name ?? 'TutorDisco'} · TutorDisco` }}
    >
      <Tab.Navigator
        tabBar={(props) => (isExpanded ? <Sidebar {...props} /> : <BottomTabBar {...props} />)}
        screenOptions={({ route }) => {
          const meta = TAB_META[route.name];
          return {
            ...headerOptions(theme),
            headerStyle: { backgroundColor: theme.colors.background, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
            tabBarPosition: isExpanded ? 'left' : 'bottom',
            title: meta.label,
            tabBarLabel: meta.label,
            tabBarIcon: ({ color }) => <meta.icon size={theme.iconSize.md + 2} color={color} strokeWidth={iconStroke} />,
            tabBarActiveTintColor: theme.colors.primaryText,
            tabBarInactiveTintColor: theme.colors.textMuted,
            tabBarLabelStyle: {
              fontFamily: theme.typography.fontFamily.sansMedium,
              fontSize: theme.typography.fontSize['2xs'] + 1,
              lineHeight: 16,
            },
            // Explicit height: the default 49pt leaves the label a ~9px box under the
            // icon, clipping Jakarta's taller line height.
            tabBarStyle: {
              height: 64 + insets.bottom,
              paddingTop: theme.space.xs,
              paddingBottom: insets.bottom + theme.space.xs,
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
            sceneStyle: { backgroundColor: theme.colors.background },
          };
        }}
      >
        {/* Stacks draw their own headers. */}
        <Tab.Screen name="StudentsTab" component={StudentsNavigator} options={{ headerShown: false }} />
        <Tab.Screen name="Payments" component={PaymentsScreen} />
        <Tab.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
        <Tab.Screen name="SettingsTab" component={SettingsNavigator} options={{ headerShown: false }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
