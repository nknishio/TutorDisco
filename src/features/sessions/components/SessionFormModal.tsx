/**
 * SessionFormModal — create or edit a session. Shows the expected payment computed
 * live from hourly rate × duration. Edit mode exposes the status field.
 *
 * Date/time use plain text inputs (YYYY-MM-DD / HH:mm) for predictable cross-platform
 * behavior; a native date/time picker can be slotted in later behind the same props.
 */
import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../shared/theme';
import {
  Button,
  HStack,
  Modal,
  Select,
  TextField,
  Text,
  VStack,
} from '../../../shared/ui';
import type {
  Cents,
  CreateInput,
  IsoDate,
  IsoTime,
  Session,
  SessionStatus,
  StudentId,
} from '../../../domain/types';
import { SESSION_STATUSES } from '../../../domain/types';
import { expectedPaymentCents } from '../../../domain/services/earnings';
import { isIsoDate, isIsoTime } from '../../../shared/utils/time';
import { parseDollarsToCents, formatCents } from '../../../shared/utils/money';
import { todayIsoDate } from '../../../shared/utils/datetime';
import { useSessionsStore } from '../../../store';

export interface SessionFormModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: StudentId;
  /** Present for edit; omit for create. */
  session?: Session;
  /** Prefill defaults for a new session (from the student). */
  defaultDuration?: number;
  defaultRateCents?: Cents;
}

const statusOptions = SESSION_STATUSES.map((s) => ({
  label: s === 'no_show' ? 'No show' : s.charAt(0).toUpperCase() + s.slice(1),
  value: s,
}));

export const SessionFormModal = ({
  visible,
  onClose,
  studentId,
  session,
  defaultDuration = 60,
  defaultRateCents,
}: SessionFormModalProps) => {
  const theme = useTheme();
  const isEdit = Boolean(session);
  const create = useSessionsStore((s) => s.create);
  const update = useSessionsStore((s) => s.update);

  const [title, setTitle] = useState(session?.title ?? 'Tutoring session');
  const [date, setDate] = useState<string>(session?.date ?? todayIsoDate());
  const [startTime, setStartTime] = useState<string>(session?.startTime ?? '15:00');
  const [duration, setDuration] = useState(String(session?.duration ?? defaultDuration));
  const [rate, setRate] = useState(
    session
      ? (session.hourlyRate / 100).toFixed(2)
      : defaultRateCents != null
        ? (defaultRateCents / 100).toFixed(2)
        : '',
  );
  const [location, setLocation] = useState(session?.location ?? '');
  const [notes, setNotes] = useState(session?.notes ?? '');
  const [status, setStatus] = useState<SessionStatus>(session?.status ?? 'scheduled');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const rateCents = useMemo(() => parseDollarsToCents(rate || '0'), [rate]);
  const durationNum = Number(duration);

  const expected = useMemo(() => {
    if (rateCents == null || !Number.isFinite(durationNum) || durationNum <= 0) return null;
    return expectedPaymentCents(rateCents, Math.round(durationNum));
  }, [rateCents, durationNum]);

  const onSubmit = async () => {
    setFormError(null);
    if (title.trim().length === 0) return setFormError('Title is required.');
    if (!isIsoDate(date)) return setFormError('Date must be in YYYY-MM-DD format.');
    if (!isIsoTime(startTime)) return setFormError('Time must be in HH:mm (24h) format.');
    if (!Number.isFinite(durationNum) || durationNum <= 0) return setFormError('Enter a valid duration.');
    if (rateCents == null) return setFormError('Enter a valid hourly rate.');

    const fields: CreateInput<Session> = {
      studentId,
      title: title.trim(),
      date: date as IsoDate,
      startTime: startTime as IsoTime,
      duration: Math.round(durationNum),
      hourlyRate: rateCents,
      location: location.trim() || null,
      status,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    const res = session ? await update({ id: session.id, ...fields }) : await create(fields);
    setSubmitting(false);

    if (res.ok) onClose();
    else setFormError(res.error.message);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit session' : 'New session'}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Create session'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      <VStack gap={theme.space.lg}>
        {formError ? <Text color="danger">{formError}</Text> : null}
        <TextField label="Title" required value={title} onChangeText={setTitle} />
        <HStack gap={theme.space.lg}>
          <VStack flex={1}>
            <TextField label="Date" required value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          </VStack>
          <VStack flex={1}>
            <TextField label="Time" required value={startTime} onChangeText={setStartTime} placeholder="HH:mm" autoCapitalize="none" />
          </VStack>
        </HStack>
        <HStack gap={theme.space.lg}>
          <VStack flex={1}>
            <TextField label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
          </VStack>
          <VStack flex={1}>
            <TextField label="Hourly rate ($)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0.00" />
          </VStack>
        </HStack>
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Online, library, …" />
        {isEdit ? <Select label="Status" value={status} options={statusOptions} onChange={setStatus} /> : null}
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        {/* Expected payment — computed live */}
        <HStack
          justify="space-between"
          align="center"
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: theme.radii.md,
            padding: theme.space.lg,
          }}
        >
          <Text variant="label" color="textMuted">Expected payment</Text>
          <Text variant="h3">{expected != null ? formatCents(expected) : '—'}</Text>
        </HStack>
      </VStack>
    </Modal>
  );
};
