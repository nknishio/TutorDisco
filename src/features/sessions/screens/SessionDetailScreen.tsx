/**
 * SessionDetailScreen — session info + status actions (complete/cancel/edit), plus
 * the session's assignments and checklist (create / edit / complete).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import {
  Badge,
  Button,
  Card,
  HStack,
  Spinner,
  Text,
  TextField,
  VStack,
} from '../../../shared/ui';
import type { Assignment, ChecklistItem } from '../../../domain/types';
import { sessionPaymentCents } from '../../../domain/services/earnings';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, formatDuration } from '../../../shared/utils/datetime';
import { useAssignmentsStore, useChecklistStore, useSessionsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { SessionFormModal } from '../components/SessionFormModal';
import { AssignmentFormModal } from '../../assignments/components/AssignmentFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

const Field = ({ label, value }: { label: string; value: string }) => (
  <HStack justify="space-between" gap={16}>
    <Text color="textMuted">{label}</Text>
    <Text variant="bodyStrong">{value}</Text>
  </HStack>
);

export const SessionDetailScreen = ({ route }: Props) => {
  const { sessionId, studentId } = route.params;
  const theme = useTheme();

  const session = useSessionsStore((s) => s.byId[sessionId]);
  const loadByStudent = useSessionsStore((s) => s.loadByStudent);
  const complete = useSessionsStore((s) => s.complete);
  const cancel = useSessionsStore((s) => s.cancel);

  const assignmentIds = useAssignmentsStore((s) => s.bySession[sessionId]);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const loadAssignments = useAssignmentsStore((s) => s.loadBySession);
  const setAssignmentComplete = useAssignmentsStore((s) => s.setComplete);

  const checklistIds = useChecklistStore((s) => s.bySession[sessionId]);
  const checklistById = useChecklistStore((s) => s.byId);
  const loadChecklist = useChecklistStore((s) => s.loadBySession);
  const createChecklist = useChecklistStore((s) => s.create);
  const toggleChecklist = useChecklistStore((s) => s.toggle);
  const removeChecklist = useChecklistStore((s) => s.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; assignment?: Assignment }>({ open: false });
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!session) void loadByStudent(studentId);
    void loadAssignments(sessionId);
    void loadChecklist(sessionId);
  }, [session, loadByStudent, studentId, loadAssignments, loadChecklist, sessionId]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Spinner fill />
      </View>
    );
  }

  const assignments = (assignmentIds ?? [])
    .map((id) => assignmentsById[id])
    .filter((a): a is Assignment => Boolean(a));
  const checklist = (checklistIds ?? [])
    .map((id) => checklistById[id])
    .filter((c): c is ChecklistItem => Boolean(c));

  const onAddChecklistItem = async () => {
    const text = newItem.trim();
    if (!text) return;
    const res = await createChecklist({ sessionId, text, completed: false });
    if (res.ok) setNewItem('');
  };

  const statusTone =
    session.status === 'completed' ? 'success'
    : session.status === 'scheduled' ? 'info'
    : session.status === 'no_show' ? 'danger' : 'neutral';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth: 820, padding: theme.space.lg }}>
        {/* Session info */}
        <Card
          title={session.title}
          headerAction={<Button label="Edit" variant="secondary" size="sm" onPress={() => setEditOpen(true)} />}
        >
          <VStack gap={theme.space.md}>
            <HStack><Badge label={session.status === 'no_show' ? 'No show' : session.status} tone={statusTone} /></HStack>
            <Field label="Date" value={formatIsoDate(session.date)} />
            <Field label="Time" value={formatIsoTime(session.startTime)} />
            <Field label="Duration" value={formatDuration(session.duration)} />
            <Field label="Location" value={session.location ?? '—'} />
            <Field label="Rate" value={`${formatCents(session.hourlyRate)}/hr`} />
            <Field label="Expected payment" value={formatCents(sessionPaymentCents(session))} />
            {session.notes ? <Field label="Notes" value={session.notes} /> : null}

            {session.status === 'scheduled' ? (
              <HStack gap={theme.space.md} justify="flex-end">
                <Button label="Cancel session" variant="ghost" onPress={() => cancel(session.id)} />
                <Button label="Mark complete" variant="primary" onPress={() => complete(session.id)} />
              </HStack>
            ) : null}
          </VStack>
        </Card>

        {/* Assignments */}
        <Card
          title="Assignments"
          subtitle={`${assignments.length} item${assignments.length === 1 ? '' : 's'}`}
          headerAction={<Button label="Add" variant="primary" size="sm" onPress={() => setAssignmentModal({ open: true })} />}
        >
          {assignments.length === 0 ? (
            <Text color="textMuted">No assignments yet.</Text>
          ) : (
            <VStack gap={theme.space.sm}>
              {assignments.map((a) => {
                const done = a.status === 'completed';
                return (
                  <HStack
                    key={a.id}
                    justify="space-between"
                    align="center"
                    gap={theme.space.md}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radii.md,
                      padding: theme.space.md,
                    }}
                  >
                    <VStack gap={2} flex={1}>
                      <Text variant="bodyStrong" style={done ? { textDecorationLine: 'line-through' } : undefined}>
                        {a.title}
                      </Text>
                      {a.dueDate ? <Text variant="caption" color="textMuted">Due {formatIsoDate(a.dueDate)}</Text> : null}
                    </VStack>
                    <Badge label={a.status === 'in_progress' ? 'In progress' : a.status} tone={done ? 'success' : 'neutral'} />
                    <Button label={done ? 'Reopen' : 'Done'} size="sm" variant={done ? 'ghost' : 'secondary'} onPress={() => setAssignmentComplete(a.id, !done)} />
                    <Button label="Edit" size="sm" variant="ghost" onPress={() => setAssignmentModal({ open: true, assignment: a })} />
                  </HStack>
                );
              })}
            </VStack>
          )}
        </Card>

        {/* Checklist */}
        <Card title="Checklist" subtitle={`${checklist.filter((c) => c.completed).length}/${checklist.length} done`}>
          <VStack gap={theme.space.md}>
            <HStack gap={theme.space.sm} align="center">
              <View style={{ flex: 1 }}>
                <TextField value={newItem} onChangeText={setNewItem} placeholder="Add a checklist item…" />
              </View>
              <Button label="Add" variant="secondary" onPress={onAddChecklistItem} />
            </HStack>

            {checklist.map((c) => (
              <HStack key={c.id} gap={theme.space.md} align="center">
                <Pressable
                  onPress={() => toggleChecklist(c.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.completed }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: theme.radii.sm,
                    borderWidth: 2,
                    borderColor: c.completed ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: c.completed ? theme.colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {c.completed ? <Text style={{ color: theme.colors.onPrimary }}>✓</Text> : null}
                </Pressable>
                <Text
                  variant="body"
                  style={[{ flex: 1 }, c.completed ? { textDecorationLine: 'line-through', color: theme.colors.textMuted } : null]}
                >
                  {c.text}
                </Text>
                <Button label="Remove" variant="ghost" size="sm" onPress={() => removeChecklist(c.id, sessionId)} />
              </HStack>
            ))}
          </VStack>
        </Card>
      </VStack>

      <SessionFormModal visible={editOpen} onClose={() => setEditOpen(false)} studentId={studentId} session={session} />
      <AssignmentFormModal
        visible={assignmentModal.open}
        onClose={() => setAssignmentModal({ open: false })}
        sessionId={sessionId}
        assignment={assignmentModal.assignment}
      />
    </ScrollView>
  );
};
