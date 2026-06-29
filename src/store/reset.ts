/**
 * resetAllStores — clears every tutoring store back to its initial data state.
 *
 * Called when switching the active account (login/logout) so one user's cached data
 * never bleeds into another's. Uses Zustand's merge setState, so the stores' action
 * methods are preserved; only the data fields are reset.
 */
import { useStudentsStore } from './studentsStore';
import { useSessionsStore } from './sessionsStore';
import { usePaymentsStore } from './paymentsStore';
import { useSettingsStore } from './settingsStore';
import { useCalendarStore } from './calendarStore';
import { useAssignmentsStore } from './assignmentsStore';
import { useChecklistStore } from './checklistStore';
import { useTemplatesStore } from './templatesStore';

export const resetAllStores = (): void => {
  useStudentsStore.setState({ byId: {}, order: [], query: '', status: 'idle', error: null });
  useSessionsStore.setState({ byId: {}, byStudent: {}, loadingStudentId: null, allLoaded: false });
  usePaymentsStore.setState({ byId: {}, order: [], status: 'idle', error: null });
  useAssignmentsStore.setState({ byId: {}, bySession: {} });
  useChecklistStore.setState({ byId: {}, bySession: {} });
  useTemplatesStore.setState({ byId: {}, order: [], status: 'idle', error: null });
  useCalendarStore.setState({ linksBySession: {}, permission: null, busySessionId: null, error: null });
  useSettingsStore.setState({
    settings: null,
    satMode: false,
    defaultChecklistItems: [],
    defaultCalendarAlerts: [],
    status: 'idle',
    error: null,
  });
};
