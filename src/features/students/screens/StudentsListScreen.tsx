/**
 * StudentsListScreen — list + search + add. Rows open the student detail screen.
 * Archived students are hidden by default; sorting and the archived toggle live in
 * one "Sort" menu so the header keeps a single primary action (Add student).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { ArrowUpDown, Plus, Search, Users } from 'lucide-react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  DraggableList,
  EmptyState,
  HStack,
  ListRow,
  Menu,
  Page,
  PageHeader,
  Skeleton,
  Text,
  TextField,
  VStack,
  type MenuItem,
} from '../../../shared/ui';
import type { Assignment, Session, SessionId, Student, StudentStatus } from '../../../domain/types';
import {
  buildCustomBase,
  mergeReorder,
  sortStudents,
  STUDENT_SORT_OPTIONS,
} from '../../../domain/services/studentSort';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDateShort, formatIsoTime, todayIsoDate } from '../../../shared/utils/datetime';
import { labelFor } from '../../../shared/utils/labels';

const formatSessionDateTime = (date: string, time: string): string =>
  `${formatIsoDateShort(date, new Date().getFullYear())} · ${formatIsoTime(time)}`;
import {
  useStudentsStore,
  useSessionsStore,
  useAssignmentsStore,
  useSettingsStore,
} from '../../../store';
import type { StudentsScreenProps } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';

type Props = StudentsScreenProps<'StudentsList'>;

const statusTone = (s: StudentStatus) =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';

export const StudentsListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const order = useStudentsStore((s) => s.order);
  const byId = useStudentsStore((s) => s.byId);
  const query = useStudentsStore((s) => s.query);
  const status = useStudentsStore((s) => s.status);
  const setQuery = useStudentsStore((s) => s.setQuery);
  const load = useStudentsStore((s) => s.load);

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

  const nextSessionText = (s: Student): string => {
    const sess = nextSessionByStudent[s.id];
    return sess ? formatSessionDateTime(sess.date, sess.startTime) : 'Not scheduled';
  };

  const columns: Column<Student>[] = [
    {
      id: 'name',
      header: 'Name',
      flex: 2,
      render: (s) => (
        <HStack gap={theme.space.md} align="center">
          <Avatar name={s.name} size="sm" />
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {s.name}
          </Text>
        </HStack>
      ),
    },
    {
      id: 'next_session',
      header: 'Next session',
      flex: 2,
      hideOnCompact: true,
      render: (s) => (
        <Text color={nextSessionByStudent[s.id] ? 'text' : 'textMuted'} tabular>
          {nextSessionText(s)}
        </Text>
      ),
    },
    {
      id: 'next_assignment',
      header: 'Next assignment',
      flex: 2,
      hideOnCompact: true,
      render: (s) => {
        const val = nextAssignmentByStudent[s.id];
        if (val === undefined || val === 'no_session') return <Text color="textMuted">—</Text>;
        if (val === null) return <Text color="warning">Not assigned</Text>;
        return <Text numberOfLines={1}>{val.title}</Text>;
      },
    },
    {
      id: 'rate',
      header: 'Rate',
      flex: 1,
      align: 'right',
      render: (s) => (
        <Text color="textMuted" tabular>
          {formatCents(s.defaultHourlyRate)}/hr
        </Text>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      flex: 1,
      align: 'right',
      render: (s) => <Badge label={labelFor(s.status)} tone={statusTone(s.status)} />,
    },
  ];

  const loading = status === 'loading' && order.length === 0;
  const openStudent = (s: Student) => navigation.navigate('StudentDetail', { studentId: s.id });

  const allStudents = order.map((id) => byId[id]).filter((s): s is Student => Boolean(s));
  const activeCount = allStudents.filter((s) => s.status === 'active').length;
  const currentCount = allStudents.filter((s) => s.status !== 'archived').length;
  const subtitle =
    currentCount === 0 ? undefined : `${currentCount} student${currentCount === 1 ? '' : 's'} · ${activeCount} active`;

  const sortLabel = STUDENT_SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'Custom order';
  const sortItems: MenuItem[] = [
    ...STUDENT_SORT_OPTIONS.map((o) => ({
      label: o.label,
      checked: o.value === sortKey,
      onSelect: () => void setStudentSort(o.value, sortDir),
    })),
    { label: 'Ascending', checked: sortDir === 'asc', separatorBefore: true, onSelect: () => void setStudentSort(sortKey, 'asc') },
    { label: 'Descending', checked: sortDir === 'desc', onSelect: () => void setStudentSort(sortKey, 'desc') },
    {
      label: 'Show archived',
      checked: showArchived,
      separatorBefore: true,
      onSelect: () => setShowArchived((v) => !v),
    },
  ];

  const addButton = <Button label="Add student" icon={Plus} onPress={() => setAddOpen(true)} />;
  const isEmpty = !loading && allStudents.length === 0;

  const renderList = () => {
    if (loading) {
      return (
        <Card padded={false}>
          {[0, 1, 2, 3].map((i) => (
            <HStack
              key={i}
              gap={theme.space.md}
              align="center"
              style={{
                padding: theme.space.lg,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: theme.colors.border,
              }}
            >
              <Skeleton width={32} height={32} radius={16} />
              <VStack gap={theme.space.xs} flex={1}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="25%" height={12} />
              </VStack>
            </HStack>
          ))}
        </Card>
      );
    }
    if (isEmpty) {
      return (
        <Card>
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Add your first student to start scheduling sessions and tracking payments."
            action={addButton}
          />
        </Card>
      );
    }
    if (canDrag && sorted.length > 0) {
      return (
        <DraggableList
          columns={columns}
          data={sorted}
          keyExtractor={(s) => s.id}
          onReorder={handleReorder}
          onRowPress={openStudent}
        />
      );
    }
    if (isCompact) {
      return sorted.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different name, email or school." />
      ) : (
        <Card padded={false}>
          {sorted.map((s, i) => (
            <ListRow
              key={s.id}
              divider={i > 0}
              leading={<Avatar name={s.name} size="sm" />}
              title={s.name}
              subtitle={nextSessionText(s)}
              trailing={<Badge label={labelFor(s.status)} tone={statusTone(s.status)} />}
              chevron
              onPress={() => openStudent(s)}
            />
          ))}
        </Card>
      );
    }
    return (
      <DataTable
        columns={columns}
        data={sorted}
        keyExtractor={(s) => s.id}
        onRowPress={openStudent}
        emptyTitle="No matches"
        emptyDescription="Try a different name, email or school."
      />
    );
  };

  return (
    <Page safeTop>
      <PageHeader title="Students" subtitle={subtitle} actions={isEmpty ? undefined : addButton} />

      <VStack gap={theme.space.md}>
        {isEmpty ? null : (
          <HStack gap={theme.space.sm} align="center">
            <View style={{ flex: 1, maxWidth: isCompact ? undefined : 360 }}>
              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder="Search students"
                autoCapitalize="none"
                leadingIcon={Search}
              />
            </View>
            <Menu
              title="Sort by"
              items={sortItems}
              renderTrigger={(open) => (
                <Button
                  label={isCompact ? 'Sort' : sortLabel}
                  accessibilityLabel={`Sort: ${sortLabel}, ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
                  variant="secondary"
                  icon={ArrowUpDown}
                  onPress={() => open()}
                />
              )}
            />
          </HStack>
        )}
        {sortKey === 'custom' && query.trim() !== '' ? (
          <Text variant="caption" color="textMuted">
            Clear the search to drag students into a custom order.
          </Text>
        ) : null}

        {renderList()}
      </VStack>

      <StudentFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </Page>
  );
};
