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
  DraggableList,
  HStack,
  Select,
  Spinner,
  Text,
  TextField,
  VStack,
} from '../../../shared/ui';
import type { Assignment, Session, SessionId, Student, StudentStatus } from '../../../domain/types';
import {
  buildCustomBase,
  mergeReorder,
  sortStudents,
  STUDENT_SORT_OPTIONS,
} from '../../../domain/services/studentSort';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoTime, todayIsoDate } from '../../../shared/utils/datetime';

const formatSessionDateTime = (date: string, time: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}/${d}/${String(y).slice(-2)} @ ${formatIsoTime(time)}`;
};
import {
  useAuthStore,
  useStudentsStore,
  useSessionsStore,
  useAssignmentsStore,
  useSettingsStore,
} from '../../../store';
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

  const sortKey = useSettingsStore((s) => s.studentSortKey);
  const sortDir = useSettingsStore((s) => s.studentSortDir);
  const customOrder = useSettingsStore((s) => s.studentCustomOrder);
  const setStudentSort = useSettingsStore((s) => s.setStudentSort);
  const setStudentCustomOrder = useSettingsStore((s) => s.setStudentCustomOrder);
  const loadSettings = useSettingsStore((s) => s.load);

  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void load();
    void loadSettings();
  }, [load, loadSettings]);

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

  // Earliest session ever (any status), used by the "First session" sort key.
  const firstSessionByStudent = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const student of visible) {
      const first = (sessionsByStudent[student.id] ?? [])
        .map((id) => sessionsById[id])
        .filter((s): s is Session => Boolean(s))
        .map((s) => `${s.date}${s.startTime}`)
        .sort((a, b) => a.localeCompare(b))[0];
      map[student.id] = first ?? null;
    }
    return map;
  }, [visible, sessionsByStudent, sessionsById]);

  // Full custom arrangement (all students, newest-added first for any not yet placed).
  const customBase = useMemo(() => buildCustomBase(order, customOrder), [order, customOrder]);

  const sorted = useMemo(
    () =>
      sortStudents(visible, sortKey, sortDir, {
        nextSessionKey: (id) => {
          const sess = nextSessionByStudent[id];
          return sess ? `${sess.date}${sess.startTime}` : null;
        },
        firstSessionKey: (id) => firstSessionByStudent[id] ?? null,
        customBase,
      }),
    [visible, sortKey, sortDir, nextSessionByStudent, firstSessionByStudent, customBase],
  );

  // Custom-order drag is only meaningful over the unfiltered list; a search narrows it.
  const canDrag = sortKey === 'custom' && query.trim() === '';

  const handleReorder = (visibleKeys: string[]) => {
    // Keys arrive top-to-bottom (display order); convert back to the stored asc base.
    const asBase = sortDir === 'desc' ? [...visibleKeys].reverse() : visibleKeys;
    void setStudentCustomOrder(mergeReorder(customBase, asBase));
  };

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
          ? <Text color="textMuted">{formatSessionDateTime(sess.date, sess.startTime)}</Text>
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
              <Button label="Settings" variant="ghost" size="sm" onPress={() => navigation.navigate('Settings')} />
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

        <HStack gap={theme.space.md} align="center" wrap>
          <Text variant="label" color="textMuted">
            Sort by
          </Text>
          <View style={{ minWidth: 200, maxWidth: 260 }}>
            <Select
              value={sortKey}
              options={STUDENT_SORT_OPTIONS}
              onChange={(k) => void setStudentSort(k, sortDir)}
              testID="student-sort-select"
            />
          </View>
          <Button
            label={sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
            variant="secondary"
            size="sm"
            onPress={() => void setStudentSort(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
          />
          {sortKey === 'custom' && query.trim() !== '' ? (
            <Text variant="caption" color="textMuted">
              Clear search to drag-reorder
            </Text>
          ) : null}
        </HStack>

        {loading ? (
          <Spinner fill />
        ) : canDrag && sorted.length > 0 ? (
          <DraggableList
            columns={columns}
            data={sorted}
            keyExtractor={(s) => s.id}
            onReorder={handleReorder}
            onRowPress={(s) => navigation.navigate('StudentDetail', { studentId: s.id })}
          />
        ) : (
          <DataTable
            columns={columns}
            data={sorted}
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
