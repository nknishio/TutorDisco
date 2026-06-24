/**
 * AssignmentFormModal — create or edit an assignment attached to a session.
 */
import React, { useState } from 'react';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, Modal, Select, TextField, Text, VStack } from '../../../shared/ui';
import type {
  Assignment,
  AssignmentStatus,
  CreateInput,
  IsoDate,
  SessionId,
} from '../../../domain/types';
import { ASSIGNMENT_STATUSES } from '../../../domain/types';
import { isIsoDate } from '../../../shared/utils/time';
import { useFormSubmit } from '../../../shared/hooks';
import { useAssignmentsStore } from '../../../store';

export interface AssignmentFormModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId: SessionId;
  assignment?: Assignment;
}

const statusOptions = ASSIGNMENT_STATUSES.map((s) => ({
  label: s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1),
  value: s,
}));

export const AssignmentFormModal = ({ visible, onClose, sessionId, assignment }: AssignmentFormModalProps) => {
  const theme = useTheme();
  const isEdit = Boolean(assignment);
  const create = useAssignmentsStore((s) => s.create);
  const update = useAssignmentsStore((s) => s.update);

  const [title, setTitle] = useState(assignment?.title ?? '');
  const [details, setDetails] = useState(assignment?.details ?? '');
  const [dueDate, setDueDate] = useState(assignment?.dueDate ?? '');
  const [status, setStatus] = useState<AssignmentStatus>(assignment?.status ?? 'pending');
  const { submitting, error: formError, setError: setFormError, submit } = useFormSubmit();

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

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit assignment' : 'New assignment'}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Add'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      <VStack gap={theme.space.lg}>
        {formError ? <Text color="danger">{formError}</Text> : null}
        <TextField label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Practice set 4, Q1–20" />
        <TextField label="Details" value={details} onChangeText={setDetails} multiline numberOfLines={3} />
        <TextField label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        {isEdit ? <Select label="Status" value={status} options={statusOptions} onChange={setStatus} /> : null}
      </VStack>
    </Modal>
  );
};
