/**
 * StudentDetailScreen — profile, revenue summary, session history, and notes.
 * Hosts the edit-student, archive, and add-session actions.
 *
 * Layout: on wide screens (web/tablet) the screen is a half/half split — profile,
 * revenue, and notes on the left; session history on the right. On phones it stacks.
 * Each session-history entry previews its assignments (name + collapsible details,
 * expanded by default) so a tutor can see at a glance where the last session left off.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Badge,
  Button,
  Card,
  HStack,
  Spinner,
  StatCard,
  Text,
  VStack,
} from '../../../shared/ui';
import type { Assignment, Session, SessionStatus, StudentStatus } from '../../../domain/types';
import { revenueSummary, sessionPaymentCents } from '../../../domain/services/earnings';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, formatDuration } from '../../../shared/utils/datetime';
import { useAssignmentsStore, useSessionsStore, useStudentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';
import { SessionFormModal } from '../../sessions/components/SessionFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentDetail'>;

const sessionTone = (s: SessionStatus) =>
  s === 'completed' ? 'success' : s === 'scheduled' ? 'info' : s === 'no_show' ? 'danger' : 'neutral';
const sessionLabel = (s: SessionStatus) => (s === 'no_show' ? 'No show' : s.charAt(0).toUpperCase() + s.slice(1));
const studentTone = (s: StudentStatus) =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';
const assignmentLabel = (s: Assignment['status']) =>
  s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1);

const Field = ({ label, value }: { label: string; value: string }) => (
  <HStack justify="space-between" gap={16}>
    <Text color="textMuted">{label}</Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  </HStack>
);

/** One assignment in a session preview: name + collapsible details (expanded by default). */
const AssignmentPreview = ({ assignment }: { assignment: Assignment }) => {
  const theme = useTheme();
  const hasDetails = Boolean(assignment.details?.trim());
  const [expanded, setExpanded] = useState(true);
  const done = assignment.status === 'completed';

  return (
    <VStack
      gap={4}
      style={{ borderLeftWidth: 2, borderLeftColor: theme.colors.border, paddingLeft: theme.space.md }}
    >
      <Pressable
        onPress={hasDetails ? () => setExpanded((v) => !v) : undefined}
        disabled={!hasDetails}
        accessibilityRole={hasDetails ? 'button' : undefined}
        accessibilityState={hasDetails ? { expanded } : undefined}
        accessibilityLabel={
          hasDetails ? `${assignment.title}. ${expanded ? 'Collapse' : 'Expand'} details.` : assignment.title
        }
      >
        <HStack gap={theme.space.sm} align="center">
          <Text color="textMuted">{hasDetails ? (expanded ? '▾' : '▸') : '•'}</Text>
          <Text
            variant="bodyStrong"
            style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}
          >
            {assignment.title}
          </Text>
          <Badge label={assignmentLabel(assignment.status)} tone={done ? 'success' : 'neutral'} />
        </HStack>
      </Pressable>

      {hasDetails && expanded ? (
        <Text color="textMuted" style={{ paddingLeft: 20 }}>
          {assignment.details}
        </Text>
      ) : null}
      {assignment.dueDate ? (
        <Text variant="caption" color="textMuted" style={{ paddingLeft: 20 }}>
          Due {formatIsoDate(assignment.dueDate)}
        </Text>
      ) : null}
    </VStack>
  );
};

/** A session-history row with its assignment previews. */
const SessionHistoryEntry = ({
  session,
  assignments,
  isLatest,
  onOpen,
}: {
  session: Session;
  assignments: readonly Assignment[];
  isLatest: boolean;
  onOpen: () => void;
}) => {
  const theme = useTheme();
  return (
    <VStack
      gap={theme.space.sm}
      style={{
        borderWidth: 1,
        borderColor: isLatest ? theme.colors.borderStrong : theme.colors.border,
        borderRadius: theme.radii.md,
        padding: theme.space.md,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open session on ${formatIsoDate(session.date)}`}
      >
        <HStack justify="space-between" align="center" gap={theme.space.md}>
          <VStack gap={2} flex={1}>
            <HStack gap={theme.space.sm} align="center" wrap>
              <Text variant="bodyStrong">{formatIsoDate(session.date)}</Text>
              {isLatest ? <Badge label="Latest" tone="info" /> : null}
            </HStack>
            <Text variant="caption" color="textMuted">
              {formatIsoTime(session.startTime)} · {formatDuration(session.duration)} ·{' '}
              {formatCents(sessionPaymentCents(session))}
            </Text>
          </VStack>
          <Badge label={sessionLabel(session.status)} tone={sessionTone(session.status)} />
        </HStack>
      </Pressable>

      {assignments.length > 0 ? (
        <VStack gap={theme.space.sm} style={{ marginTop: theme.space.xs }}>
          {assignments.map((a) => (
            <AssignmentPreview key={a.id} assignment={a} />
          ))}
        </VStack>
      ) : (
        <Text variant="caption" color="textMuted">
          No assignments logged.
        </Text>
      )}
    </VStack>
  );
};

export const StudentDetailScreen = ({ route, navigation }: Props) => {
  const { studentId } = route.params;
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const student = useStudentsStore((s) => s.byId[studentId]);
  const loadStudents = useStudentsStore((s) => s.load);
  const archive = useStudentsStore((s) => s.archive);

  const sessionIds = useSessionsStore((s) => s.byStudent[studentId]);
  const sessionsById = useSessionsStore((s) => s.byId);
  const loadByStudent = useSessionsStore((s) => s.loadByStudent);

  const assignmentsBySession = useAssignmentsStore((s) => s.bySession);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const loadAssignments = useAssignmentsStore((s) => s.loadForSessions);

  const [editOpen, setEditOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  useEffect(() => {
    if (!student) void loadStudents();
    void loadByStudent(studentId);
  }, [student, loadStudents, loadByStudent, studentId]);

  // Most recent first, so the latest session (where we left off) is at the top.
  const sessions = useMemo(
    () =>
      (sessionIds ?? [])
        .map((id) => sessionsById[id])
        .filter((x): x is Session => Boolean(x))
        .sort((a, b) =>
          a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.startTime < b.startTime ? 1 : -1,
        ),
    [sessionIds, sessionsById],
  );

  // Pull in the assignments for every listed session for the history previews.
  useEffect(() => {
    if (sessions.length > 0) void loadAssignments(sessions.map((s) => s.id));
  }, [sessions, loadAssignments]);

  const assignmentsFor = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const sess of sessions) {
      map[sess.id] = (assignmentsBySession[sess.id] ?? [])
        .map((id) => assignmentsById[id])
        .filter((a): a is Assignment => Boolean(a));
    }
    return map;
  }, [sessions, assignmentsBySession, assignmentsById]);

  const summary = useMemo(() => revenueSummary(sessions), [sessions]);

  if (!student) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Spinner fill />
      </View>
    );
  }

  const onArchive = async () => {
    const res = await archive(student.id);
    if (res.ok) navigation.goBack();
  };

  const profileColumn = (
    <VStack gap={theme.space.lg}>
      {/* Profile */}
      <Card
        title={student.name}
        subtitle={student.gradeLevel ? `Grade ${student.gradeLevel}` : undefined}
        headerAction={
          <HStack gap={theme.space.sm}>
            <Button label="Edit" variant="secondary" size="sm" onPress={() => setEditOpen(true)} />
            {student.status !== 'archived' ? (
              <Button label="Archive" variant="ghost" size="sm" onPress={onArchive} />
            ) : null}
          </HStack>
        }
      >
        <VStack gap={theme.space.md}>
          <HStack><Badge label={student.status} tone={studentTone(student.status)} /></HStack>
          <Field label="Email" value={student.email ?? '—'} />
          <Field label="Parent email" value={student.parentEmail ?? '—'} />
          <Field label="School" value={student.school ?? '—'} />
          <Field label="Default rate" value={`${formatCents(student.defaultHourlyRate)}/hr`} />
          <Field label="Default duration" value={formatDuration(student.defaultDuration)} />
        </VStack>
      </Card>

      {/* Revenue summary */}
      <HStack gap={theme.space.lg} wrap>
        <StatCard label="Earned" value={formatCents(summary.completedCents)} />
        <StatCard label="Projected" value={formatCents(summary.scheduledCents)} />
        <StatCard label="Hours taught" value={(summary.completedMinutes / 60).toFixed(1)} />
        <StatCard label="Sessions done" value={String(summary.completedCount)} />
      </HStack>

      {/* Notes */}
      <Card title="Notes">
        <Text color={student.notes ? 'text' : 'textMuted'}>
          {student.notes?.trim() ? student.notes : 'No notes yet. Use Edit to add notes.'}
        </Text>
      </Card>
    </VStack>
  );

  const sessionHistoryColumn = (
    <Card
      title="Session history"
      subtitle={`${sessions.length} session${sessions.length === 1 ? '' : 's'}`}
      headerAction={<Button label="Add session" variant="primary" size="sm" onPress={() => setSessionOpen(true)} />}
    >
      {sessions.length === 0 ? (
        <VStack gap={theme.space.xs}>
          <Text variant="bodyStrong">No sessions yet</Text>
          <Text color="textMuted">Add a session to start tracking.</Text>
        </VStack>
      ) : (
        <VStack gap={theme.space.md}>
          {sessions.map((s, i) => (
            <SessionHistoryEntry
              key={s.id}
              session={s}
              assignments={assignmentsFor[s.id] ?? []}
              isLatest={i === 0}
              onOpen={() => navigation.navigate('SessionDetail', { sessionId: s.id, studentId: student.id })}
            />
          ))}
        </VStack>
      )}
    </Card>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: isCompact ? 1080 : 1280, padding: theme.space.lg }}>
        {isCompact ? (
          <VStack gap={theme.space.lg}>
            {profileColumn}
            {sessionHistoryColumn}
            <View style={{ height: theme.space.xl }} />
          </VStack>
        ) : (
          <HStack gap={theme.space.lg} align="flex-start">
            <View style={{ flex: 1 }}>{profileColumn}</View>
            <View style={{ flex: 1 }}>{sessionHistoryColumn}</View>
          </HStack>
        )}
      </View>

      <StudentFormModal visible={editOpen} onClose={() => setEditOpen(false)} student={student} />
      <SessionFormModal
        visible={sessionOpen}
        onClose={() => setSessionOpen(false)}
        studentId={student.id}
        defaultDuration={student.defaultDuration}
        defaultRateCents={student.defaultHourlyRate}
      />
    </ScrollView>
  );
};
