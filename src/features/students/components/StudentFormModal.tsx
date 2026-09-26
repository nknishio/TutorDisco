/**
 * StudentFormModal — add or edit a student. Edit mode when `student` is provided.
 * Persists via the students store; surfaces repository validation errors inline.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import {
  Button,
  HStack,
  Modal,
  Section,
  Select,
  TextField,
  Text,
  VStack,
} from '../../../shared/ui';
import type { Cents, CreateInput, GradeLevel, Student, StudentStatus } from '../../../domain/types';
import { GRADE_LEVELS, STUDENT_STATUSES } from '../../../domain/types';
import { parseDollarsToCents } from '../../../shared/utils/money';
import { labelFor } from '../../../shared/utils/labels';
import { useFormSubmit } from '../../../shared/hooks';
import { useStudentsStore } from '../../../store';

export interface StudentFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present for edit; omit for create. */
  student?: Student;
}

const GRADE_LABELS: Record<GradeLevel, string> = {
  '9': 'Grade 9',
  '10': 'Grade 10',
  '11': 'Grade 11',
  '12': 'Grade 12',
  college: 'College',
  adult: 'Adult',
  other: 'Other',
};
const gradeOptions = GRADE_LEVELS.map((g) => ({ label: GRADE_LABELS[g], value: g }));
const statusOptions = STUDENT_STATUSES.map((s) => ({ label: labelFor(s), value: s }));

export const StudentFormModal = ({ visible, onClose, student }: StudentFormModalProps) => {
  const theme = useTheme();
  const isEdit = Boolean(student);
  const create = useStudentsStore((s) => s.create);
  const update = useStudentsStore((s) => s.update);

  const [name, setName] = useState(student?.name ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [parentName, setParentName] = useState(student?.parentName ?? '');
  const [parentEmail, setParentEmail] = useState(student?.parentEmail ?? '');
  const [grade, setGrade] = useState<GradeLevel | null>(student?.gradeLevel ?? null);
  const [school, setSchool] = useState(student?.school ?? '');
  const [status, setStatus] = useState<StudentStatus>(student?.status ?? 'active');
  const [duration, setDuration] = useState(String(student?.defaultDuration ?? 60));
  const [rate, setRate] = useState(
    student ? (student.defaultHourlyRate / 100).toFixed(2) : '',
  );
  const [notes, setNotes] = useState(student?.notes ?? '');

  const { submitting, error: formError, setError: setFormError, submit } = useFormSubmit();

  // The modal stays mounted and is toggled via `visible`, so the useState initialisers
  // above run once. Re-sync every field on open so Add starts blank and Edit shows the
  // current record (CLAUDE.md "Form modals are mounted once").
  useEffect(() => {
    if (!visible) return;
    setName(student?.name ?? '');
    setEmail(student?.email ?? '');
    setParentName(student?.parentName ?? '');
    setParentEmail(student?.parentEmail ?? '');
    setGrade(student?.gradeLevel ?? null);
    setSchool(student?.school ?? '');
    setStatus(student?.status ?? 'active');
    setDuration(String(student?.defaultDuration ?? 60));
    setRate(student ? (student.defaultHourlyRate / 100).toFixed(2) : '');
    setNotes(student?.notes ?? '');
    setFormError(null);
  }, [visible, student, setFormError]);

  const rateCents = useMemo(() => parseDollarsToCents(rate || '0'), [rate]);
  const durationNum = Number(duration);
  const nameInvalid = name.trim().length === 0;

  const onSubmit = () => {
    setFormError(null);
    if (nameInvalid) {
      setFormError('Name is required.');
      return;
    }
    if (rateCents == null) {
      setFormError('Enter a valid hourly rate.');
      return;
    }
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      setFormError('Enter a valid default duration in minutes.');
      return;
    }

    const fields: CreateInput<Student> = {
      name: name.trim(),
      email: email.trim() || null,
      parentName: parentName.trim() || null,
      parentEmail: parentEmail.trim() || null,
      gradeLevel: grade,
      school: school.trim() || null,
      notes: notes.trim() || null,
      status,
      defaultDuration: Math.round(durationNum),
      defaultHourlyRate: rateCents as Cents,
    };

    void submit(
      () => (student ? update({ id: student.id, ...fields }) : create(fields)),
      onClose,
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit student' : 'Add student'}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Add student'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      <VStack gap={theme.space['2xl']}>
        {formError ? <Text color="danger">{formError}</Text> : null}
        <Section title="Student">
          <TextField label="Full name" required value={name} onChangeText={setName} placeholder="e.g. Ava Chen" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <HStack gap={theme.space.lg} wrap>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Select label="Grade level" value={grade} options={gradeOptions} onChange={setGrade} placeholder="Select a grade" />
            </View>
            <View style={{ flex: 1, minWidth: 160 }}>
              <TextField label="School" value={school} onChangeText={setSchool} />
            </View>
          </HStack>
          <Select label="Status" value={status} options={statusOptions} onChange={setStatus} />
        </Section>

        <Section title="Parent or guardian">
          <HStack gap={theme.space.lg} wrap>
            <View style={{ flex: 1, minWidth: 160 }}>
              <TextField label="Name" value={parentName} onChangeText={setParentName} placeholder="e.g. Mr. Chen" />
            </View>
            <View style={{ flex: 1, minWidth: 160 }}>
              <TextField
                label="Email"
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </HStack>
        </Section>

        <Section title="Session defaults" description="Pre-filled on every new session for this student.">
          <HStack gap={theme.space.lg}>
            <View style={{ flex: 1 }}>
              <TextField label="Length (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Hourly rate ($)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
          </HStack>
        </Section>

        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </VStack>
    </Modal>
  );
};
