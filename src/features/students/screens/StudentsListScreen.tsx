/**
 * StudentsListScreen — list + search + add. Rows open the student detail screen.
 * Archived students are hidden by default behind a filter toggle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Badge,
  Button,
  Column,
  DataTable,
  HStack,
  Spinner,
  Text,
  TextField,
  VStack,
} from '../../../shared/ui';
import type { Assignment, Session, SessionId, Student, StudentStatus } from '../../../domain/types';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, todayIsoDate } from '../../../shared/utils/datetime';
import { useAuthStore, useStudentsStore, useSessionsStore, useAssignmentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentsList'>;

const statusTone = (s: StudentStatus) =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';

export const StudentsListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { select, isCompact } = useResponsive();

  const order = useStudentsStore((s) => s.order);
  const byId = useStudentsStore((s) => s.byId);
  const query = useStudentsStore((s) => s.query);
  const status = useStudentsStore((s) => s.status);
  const setQuery = useStudentsStore((s) => s.setQuery);
  const load = useStudentsStore((s) => s.load);

  const currentAccount = useAuthStore((s) => s.currentAccount);
  const logout = useAuthStore((s) => s.logout);

  const sessionsByStudent = useSessionsStore((s) => s.byStudent);
  const sessionsById = useSessionsStore((s) => s.byId);
  const loadAllSessions = useSessionsStore((s) => s.loadAll);

  const assignmentsBySession = useAssignmentsStore((s) => s.bySession);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const loadForSessions = useAssignmentsStore((s) => s.loadForSessions);

  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      await loadAllSessions();
      const ids = Object.keys(useSessionsStore.getState().byId) as SessionId[];
      void loadForSessions(ids);
    })();
  }, [loadAllSessions, loadForSessions]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return order
      .map((id) => byId[id])
      .filter((s): s is Student => Boolean(s))
      .filter((s) => (showArchived ? true : s.status !== 'archived'))
      .filter((s) =>
        q === ''
          ? true
          : s.name.toLowerCase().includes(q) ||
            (s.email ?? '').toLowerCase().includes(q) ||
            (s.school ?? '').toLowerCase().includes(q),
      );
  }, [order, byId, query, showArchived]);

  const today = todayIsoDate();

  const nextSessionByStudent = useMemo(() => {
    const map: Record<string, Session | null> = {};
    for (const student of visible) {
      const sessions = (sessionsByStudent[student.id] ?? [])
        .map((id) => sessionsById[id])
        .filter((s): s is Session => Boolean(s))
        .filter((s) => s.status === 'scheduled' && s.date >= today)
        .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
      map[student.id] = sessions[0] ?? null;
    }
    return map;
  }, [visible, sessionsByStudent, sessionsById, today]);

  const nextAssignmentByStudent = useMemo(() => {
    const map: Record<string, Assignment | null | 'no_session'> = {};
    for (const student of visible) {
      if (!nextSessionByStudent[student.id]) {
        map[student.id] = 'no_session';
        continue;
      }
      const upcomingSessions = (sessionsByStudent[student.id] ?? [])
        .map((id) => sessionsById[id])
        .filter((s): s is Session => Boolean(s))
        .filter((s) => s.status === 'scheduled' && s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
      let found: Assignment | null = null;
      for (const sess of upcomingSessions) {
        const pending = (assignmentsBySession[sess.id] ?? [])
          .map((id) => assignmentsById[id])
          .filter((a): a is Assignment => Boolean(a))
          .filter((a) => a.status === 'pending' || a.status === 'in_progress');
        if (pending.length > 0) { found = pending[0]!; break; }
      }
      map[student.id] = found;
    }
    return map;
  }, [visible, nextSessionByStudent, sessionsByStudent, sessionsById, assignmentsBySession, assignmentsById, today]);

  const columns: Column<Student>[] = [
    { id: 'name', header: 'Name', flex: 2, render: (s) => <Text variant="bodyStrong">{s.name}</Text> },
    {
      id: 'next_session',
      header: 'Next Session',
      flex: 2,
      hideOnCompact: true,
      render: (s) => {
        const sess = nextSessionByStudent[s.id];
        return sess
          ? <Text color="textMuted">{formatIsoDate(sess.date)}</Text>
          : <Text color="textMuted">Not scheduled</Text>;
      },
    },
    {
      id: 'next_assignment',
      header: 'Next Assignment',
      flex: 2,
      hideOnCompact: true,
      render: (s) => {
        const val = nextAssignmentByStudent[s.id];
        if (val === undefined || val === 'no_session') return <Text color="textMuted">Not scheduled</Text>;
        if (val === null) return <Text color="danger">Not assigned</Text>;
        return <Text color="textMuted">{val.title}</Text>;
      },
    },
    { id: 'rate', header: 'Rate', flex: 1, align: 'right', render: (s) => <Text color="textMuted">{formatCents(s.defaultHourlyRate)}/hr</Text> },
    { id: 'status', header: 'Status', flex: 1, align: 'right', render: (s) => <Badge label={s.status} tone={statusTone(s.status)} /> },
  ];

  const maxWidth = select({ compact: 9999, expanded: 1080 });
  const loading = status === 'loading' && order.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth, padding: theme.space.lg }}>
        {/*
          Header. On phones the search field takes its own full-width row and the
          actions wrap across lines below — otherwise the five buttons overflow the
          screen width on iOS. On wider screens they share one row.
        */}
        {(() => {
          const actions = (
            <HStack gap={theme.space.sm} align="center" wrap>
              {currentAccount ? <Badge label={currentAccount.displayName} tone="neutral" /> : null}
              <Button
                label={showArchived ? 'Hide archived' : 'Show archived'}
                variant="ghost"
                size="sm"
                onPress={() => setShowArchived((v) => !v)}
              />
              <Button label="Templates" variant="ghost" size="sm" onPress={() => navigation.navigate('Templates')} />
              <Button label="Revenue" variant="ghost" size="sm" onPress={() => navigation.navigate('RevenueDashboard')} />
              <Button label="Payments" variant="secondary" size="sm" onPress={() => navigation.navigate('Payments')} />
              <Button label="Add student" variant="primary" size="sm" onPress={() => setAddOpen(true)} />
              <Button label="Sign out" variant="ghost" size="sm" onPress={() => void logout()} />
            </HStack>
          );

          return isCompact ? (
            <VStack gap={theme.space.md}>
              <TextField value={query} onChangeText={setQuery} placeholder="Search students…" autoCapitalize="none" />
              {actions}
            </VStack>
          ) : (
            <HStack gap={theme.space.md} justify="space-between" align="center" wrap>
              <View style={{ flex: 1, minWidth: 220 }}>
                <TextField value={query} onChangeText={setQuery} placeholder="Search students…" autoCapitalize="none" />
              </View>
              {actions}
            </HStack>
          );
        })()}

        {loading ? (
          <Spinner fill />
        ) : (
          <DataTable
            columns={columns}
            data={visible}
            keyExtractor={(s) => s.id}
            onRowPress={(s) => navigation.navigate('StudentDetail', { studentId: s.id })}
            emptyTitle={query ? 'No matches' : 'No students yet'}
            emptyDescription={query ? 'Try a different search.' : 'Add your first student — the dance floor awaits.'}
          />
        )}
      </VStack>

      <StudentFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScrollView>
  );
};
