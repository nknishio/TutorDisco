/**
 * AssignmentFormModal — create or edit an assignment attached to a session.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import { Badge, Button, HStack, Modal, Select, TextField, Text, VStack } from '../../../shared/ui';
import type {
  Assignment,
  AssignmentStatus,
  CreateInput,
  IsoDate,
  SessionId,
  StudentId,
} from '../../../domain/types';
import { ASSIGNMENT_STATUSES } from '../../../domain/types';
import { isIsoDate } from '../../../shared/utils/time';
import { formatIsoDate } from '../../../shared/utils/datetime';
import { useFormSubmit } from '../../../shared/hooks';
import { useAssignmentsStore, useSessionsStore } from '../../../store';

export interface AssignmentFormModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId: SessionId;
  /** Owning student — enables the "See previous assignments" browser across sessions. */
  studentId?: StudentId;
  assignment?: Assignment;
}

const statusOptions = ASSIGNMENT_STATUSES.map((s) => ({
  label: s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1),
  value: s,
}));

export const AssignmentFormModal = ({ visible, onClose, sessionId, studentId, assignment }: AssignmentFormModalProps) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const isEdit = Boolean(assignment);
  const create = useAssignmentsStore((s) => s.create);
  const update = useAssignmentsStore((s) => s.update);

  const [title, setTitle] = useState(assignment?.title ?? '');
  const [details, setDetails] = useState(assignment?.details ?? '');
  const [dueDate, setDueDate] = useState(assignment?.dueDate ?? '');
  const [status, setStatus] = useState<AssignmentStatus>(assignment?.status ?? 'pending');
  const { submitting, error: formError, setError: setFormError, submit } = useFormSubmit();

  // Previous assignments: gather this student's assignments across all their sessions.
  const sessionsById = useSessionsStore((s) => s.byId);
  const sessionIdsForStudent = useSessionsStore((s) => (studentId ? s.byStudent[studentId] : undefined));
  const loadSessions = useSessionsStore((s) => s.loadByStudent);
  const assignmentsById = useAssignmentsStore((s) => s.byId);
  const assignmentsBySession = useAssignmentsStore((s) => s.bySession);
  const loadForSessions = useAssignmentsStore((s) => s.loadForSessions);

  // Re-sync fields when the modal (re)opens for a given assignment. The modal stays
  // mounted and is just toggled visible, so useState initializers (which run once at
  // mount) would otherwise leave Edit showing stale/empty fields — notably the details.
  useEffect(() => {
    if (!visible) return;
    setTitle(assignment?.title ?? '');
    setDetails(assignment?.details ?? '');
    setDueDate(assignment?.dueDate ?? '');
    setStatus(assignment?.status ?? 'pending');
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, assignment]);

  // On open, make sure this student's sessions and their assignments are loaded
  // (sessions other than the current one may not be in the cache yet), so the
  // previous-assignments panel is populated.
  useEffect(() => {
    if (!visible || !studentId) return;
    void (async () => {
      if (!sessionIdsForStudent) await loadSessions(studentId);
      const ids = useSessionsStore.getState().byStudent[studentId] ?? [];
      await loadForSessions(ids as SessionId[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, studentId]);

  const previousAssignments = useMemo(() => {
    if (!studentId) return [];
    const ids = sessionIdsForStudent ?? [];
    const items: Assignment[] = [];
    for (const sid of ids) {
      for (const aid of assignmentsBySession[sid] ?? []) {
        const a = assignmentsById[aid];
        if (a && a.id !== assignment?.id) items.push(a);
      }
    }
    // Most recent session first; fall back to createdAt for stable ordering.
    return items.sort((x, y) => {
      const dx = sessionsById[x.sessionId]?.date ?? '';
      const dy = sessionsById[y.sessionId]?.date ?? '';
      if (dx !== dy) return dy.localeCompare(dx);
      return (y.createdAt ?? 0) - (x.createdAt ?? 0);
    });
  }, [studentId, sessionIdsForStudent, assignmentsBySession, assignmentsById, sessionsById, assignment?.id]);

  const usePrevious = (a: Assignment) => {
    setTitle(a.title);
    setDetails(a.details ?? '');
    setFormError(null);
  };

  const onSubmit = () => {
    setFormError(null);
    if (title.trim().length === 0) return setFormError('Title is required.');
    if (dueDate.trim() !== '' && !isIsoDate(dueDate.trim())) {
      return setFormError('Due date must be in YYYY-MM-DD format.');
    }

    const fields: CreateInput<Assignment> = {
      sessionId,
      title: title.trim(),
      details: details.trim() || null,
      dueDate: dueDate.trim() ? (dueDate.trim() as IsoDate) : null,
      status,
    };

    void submit(
      () => (assignment ? update({ id: assignment.id, ...fields }) : create(fields)),
      onClose,
    );
  };

  const formBlock = (
    <VStack gap={theme.space.lg} flex={isCompact ? undefined : 1}>
      {formError ? <Text color="danger">{formError}</Text> : null}
      <TextField label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Practice set 4, Q1–20" />
      <TextField label="Details" value={details} onChangeText={setDetails} multiline numberOfLines={3} />
      <TextField label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      {isEdit ? <Select label="Status" value={status} options={statusOptions} onChange={setStatus} /> : null}
    </VStack>
  );

  const previousBlock = studentId ? (
    <VStack gap={theme.space.sm} style={isCompact ? undefined : { width: 320 }}>
      <Text variant="bodyStrong">Previous assignments</Text>
      {previousAssignments.length === 0 ? (
        <Text color="textMuted" variant="caption">No previous assignments for this student.</Text>
      ) : (
        <View
          style={{
            maxHeight: isCompact ? 260 : 420,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
          }}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <VStack>
              {previousAssignments.map((a, i) => {
                const done = a.status === 'completed';
                const session = sessionsById[a.sessionId];
                return (
                  <VStack
                    key={a.id}
                    gap={theme.space.xs}
                    style={{
                      padding: theme.space.md,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <HStack justify="space-between" align="center" gap={theme.space.sm}>
                      <Text variant="bodyStrong" style={{ flex: 1 }} selectable>{a.title}</Text>
                      <Badge
                        label={a.status === 'in_progress' ? 'In progress' : a.status}
                        tone={done ? 'success' : 'neutral'}
                      />
                    </HStack>
                    {a.details ? (
                      <Text variant="caption" color="textMuted" selectable>{a.details}</Text>
                    ) : null}
                    {session ? (
                      <Text variant="caption" color="textMuted" selectable>
                        From “{session.title}” · {formatIsoDate(session.date)}
                      </Text>
                    ) : null}
                    <HStack>
                      <Button
                        label="Use in form"
                        variant="secondary"
                        size="sm"
                        onPress={() => usePrevious(a)}
                        accessibilityLabel={`Use "${a.title}" in the form`}
                      />
                    </HStack>
                  </VStack>
                );
              })}
            </VStack>
          </ScrollView>
        </View>
      )}
    </VStack>
  ) : null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit assignment' : 'New assignment'}
      maxWidth={studentId && !isCompact ? 900 : 520}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Add'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      {previousBlock && !isCompact ? (
        <HStack gap={theme.space.xl} align="flex-start">
          {formBlock}
          {previousBlock}
        </HStack>
      ) : (
        <VStack gap={theme.space.xl}>
          {formBlock}
          {previousBlock}
        </VStack>
      )}
    </Modal>
  );
};
