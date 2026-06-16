/**
 * Typed navigation param lists. Route params carry branded IDs so navigation can't
 * be handed the wrong kind of id (docs/navigation.md).
 *
 * Forms (add/edit student, session, assignment) are presented as in-screen modals
 * rather than routes, so they don't appear here.
 */
import type { SessionId, StudentId } from '../../domain/types';

export type RootStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: StudentId };
  SessionDetail: { sessionId: SessionId; studentId: StudentId };
  Payments: undefined;
  RevenueDashboard: undefined;
  Templates: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
