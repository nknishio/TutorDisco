/** Label + icon per tab, shared by the bottom bar and the sidebar. */
import { ChartColumn, Receipt, Settings, Users, type LucideIcon } from 'lucide-react-native';
import type { MainTabParamList } from './types';

export const TAB_META: Record<keyof MainTabParamList, { label: string; icon: LucideIcon }> = {
  StudentsTab: { label: 'Students', icon: Users },
  Payments: { label: 'Payments', icon: Receipt },
  RevenueDashboard: { label: 'Revenue', icon: ChartColumn },
  SettingsTab: { label: 'Settings', icon: Settings },
};
