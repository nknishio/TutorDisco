/**
 * Typed navigation param lists. Route params carry branded IDs so navigation can't
 * be handed the wrong kind of id (docs/navigation.md).
 *
 * Shape: a tab navigator (bottom bar on phones, sidebar on wide web) whose Students
 * and Settings tabs each hold a native stack. Screen names are unique across the
 * whole tree, so `navigate('Payments')` works from anywhere; reaching a screen nested
 * in ANOTHER tab's stack needs the nested form, e.g.
 * `navigate('SettingsTab', { screen: 'Templates' })`.
 *
 * Forms (add/edit student, session, assignment) are presented as in-screen modals
 * rather than routes, so they don't appear here.
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SessionId, StudentId } from '../../domain/types';

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: StudentId };
  SessionDetail: { sessionId: SessionId; studentId: StudentId };
};

export type SettingsStackParamList = {
  Settings: undefined;
  Templates: undefined;
};

export type MainTabParamList = {
  StudentsTab: NavigatorScreenParams<StudentsStackParamList> | undefined;
  Payments: undefined;
  RevenueDashboard: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

/** Props for a screen in the Students stack. */
export type StudentsScreenProps<T extends keyof StudentsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<StudentsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

/** Props for a screen in the Settings stack. */
export type SettingsScreenProps<T extends keyof SettingsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, T>,
  BottomTabScreenProps<MainTabParamList>
>;

/** Props for a screen mounted directly as a tab. */
export type TabScreenProps<T extends 'Payments' | 'RevenueDashboard'> = BottomTabScreenProps<MainTabParamList, T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends MainTabParamList {}
  }
}
