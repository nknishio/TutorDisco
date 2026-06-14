/**
 * StudentDetailScreen — profile, revenue summary, session history, and notes.
 * Hosts the edit-student, archive, and add-session actions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  HStack,
  Spinner,
  StatCard,
  Text,
  VStack,
} from '../../../shared/ui';
import type { Session, SessionStatus, StudentStatus } from '../../../domain/types';
import { revenueSummary, sessionPaymentCents } from '../../../domain/services/earnings';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, formatDuration } from '../../../shared/utils/datetime';
import { useSessionsStore, useStudentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';
import { SessionFormModal } from '../../sessions/components/SessionFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentDetail'>;

const sessionTone = (s: SessionStatus) =>
  s === 'completed' ? 'success' : s === 'scheduled' ? 'info' : s === 'no_show' ? 'danger' : 'neutral';
const sessionLabel = (s: SessionStatus) => (s === 'no_show' ? 'No show' : s.charAt(0).toUpperCase() + s.slice(1));
const studentTone = (s: StudentStatus) =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';

const Field = ({ label, value }: { label: string; value: string }) => (
  <HStack justify="space-between" gap={16}>
    <Text color="textMuted">{label}</Text>
    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  </HStack>
);

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

  const [editOpen, setEditOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  useEffect(() => {
    if (!student) void loadStudents();
    void loadByStudent(studentId);
  }, [student, loadStudents, loadByStudent, studentId]);

  const sessions = useMemo(
    () => (sessionIds ?? []).map((id) => sessionsById[id]).filter((x): x is Session => Boolean(x)),
    [sessionIds, sessionsById],
  );
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

  const columns: Column<Session>[] = [
    { id: 'date', header: 'Date', flex: 2, render: (s) => <Text variant="bodyStrong">{formatIsoDate(s.date)}</Text> },
    { id: 'time', header: 'Time', flex: 1, render: (s) => <Text color="textMuted">{formatIsoTime(s.startTime)}</Text> },
    { id: 'dur', header: 'Duration', flex: 1, render: (s) => <Text color="textMuted">{formatDuration(s.duration)}</Text> },
    { id: 'pay', header: 'Payment', flex: 1, align: 'right', render: (s) => <Text color="textMuted">{formatCents(sessionPaymentCents(s))}</Text> },
    { id: 'status', header: 'Status', flex: 1, align: 'right', render: (s) => <Badge label={sessionLabel(s.status)} tone={sessionTone(s.status)} /> },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth: 1080, padding: theme.space.lg }}>
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

        {/* Session history */}
        <Card
          title="Session history"
          subtitle={`${sessions.length} session${sessions.length === 1 ? '' : 's'}`}
          headerAction={<Button label="Add session" variant="primary" size="sm" onPress={() => setSessionOpen(true)} />}
        >
          <DataTable
            columns={columns}
            data={sessions}
            keyExtractor={(s) => s.id}
            onRowPress={(s) => navigation.navigate('SessionDetail', { sessionId: s.id, studentId: student.id })}
            emptyTitle="No sessions yet"
            emptyDescription="Add a session to start tracking."
          />
        </Card>

        {isCompact ? <View style={{ height: theme.space.xl }} /> : null}
      </VStack>

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
