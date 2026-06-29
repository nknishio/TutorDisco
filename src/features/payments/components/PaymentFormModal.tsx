/**
 * PaymentFormModal — create or edit a payment.
 *
 * The amount is calculated automatically when the payment is tied to a session
 * (hourly rate × duration / 60); the field stays editable for ad-hoc adjustments.
 * A received date is required once the status is 'paid' (enforced by validation too).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../../shared/theme';
import { Button, HStack, Modal, Select, Text, TextField, VStack } from '../../../shared/ui';
import type {
  CreateInput,
  IsoDate,
  Payment,
  PaymentStatus,
  SessionId,
  StudentId,
} from '../../../domain/types';
import { PAYMENT_STATUSES } from '../../../domain/types';
import { sessionPaymentCents } from '../../../domain/services/earnings';
import { formatCents, parseDollarsToCents } from '../../../shared/utils/money';
import { formatIsoDate, todayIsoDate } from '../../../shared/utils/datetime';
import { isIsoDate } from '../../../shared/utils/time';
import { useFormSubmit } from '../../../shared/hooks';
import { usePaymentsStore, useSessionsStore, useStudentsStore } from '../../../store';

export interface PaymentFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Edit an existing payment; omit to create. */
  payment?: Payment;
  /** Preselect a student on create (e.g. opened from a student's page). */
  studentId?: StudentId;
}

const NONE = '';

const statusLabel = (s: PaymentStatus) => s.charAt(0).toUpperCase() + s.slice(1);
const statusOptions = PAYMENT_STATUSES.map((s) => ({ label: statusLabel(s), value: s }));

const centsToDollars = (cents: number) => (cents / 100).toFixed(2);

export const PaymentFormModal = ({ visible, onClose, payment, studentId }: PaymentFormModalProps) => {
  const theme = useTheme();
  const isEdit = Boolean(payment);

  const create = usePaymentsStore((s) => s.create);
  const update = usePaymentsStore((s) => s.update);

  const studentOrder = useStudentsStore((s) => s.order);
  const studentsById = useStudentsStore((s) => s.byId);
  const sessionsById = useSessionsStore((s) => s.byId);
  const sessionsByStudent = useSessionsStore((s) => s.byStudent);

  const [student, setStudent] = useState<string>(payment?.studentId ?? studentId ?? NONE);
  const [session, setSession] = useState<string>(payment?.sessionId ?? NONE);
  const [amount, setAmount] = useState<string>(payment ? centsToDollars(payment.amount) : '');
  const [status, setStatus] = useState<PaymentStatus>(payment?.status ?? 'pending');
  const [receivedDate, setReceivedDate] = useState<string>(payment?.receivedDate ?? todayIsoDate());

  const { submitting, error: formError, setError: setFormError, submit } = useFormSubmit();

  // Re-sync fields when the modal (re)opens for a given payment. The modal stays mounted
  // and is just toggled visible, so useState initializers (run once at mount) would leave
  // Edit showing a blank form instead of the payment's current values.
  useEffect(() => {
    if (!visible) return;
    setStudent(payment?.studentId ?? studentId ?? NONE);
    setSession(payment?.sessionId ?? NONE);
    setAmount(payment ? centsToDollars(payment.amount) : '');
    setStatus(payment?.status ?? 'pending');
    setReceivedDate(payment?.receivedDate ?? todayIsoDate());
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, payment, studentId]);

  const studentOptions = useMemo(
    () => [
      { label: 'Select a student…', value: NONE },
      ...studentOrder
        .map((id) => studentsById[id])
        .filter(Boolean)
        .map((s) => ({ label: s!.name, value: s!.id as string })),
    ],
    [studentOrder, studentsById],
  );

  const sessionOptions = useMemo(() => {
    const ids = student ? sessionsByStudent[student] ?? [] : [];
    const sessions = ids.map((id) => sessionsById[id]).filter(Boolean);
    return [
      { label: 'No session (ad-hoc)', value: NONE },
      ...sessions.map((s) => ({
        label: `${formatIsoDate(s!.date)} · ${formatCents(sessionPaymentCents(s!))}`,
        value: s!.id as string,
      })),
    ];
  }, [student, sessionsByStudent, sessionsById]);

  // Selecting a session auto-fills the amount from rate × duration.
  const onSelectSession = (value: string) => {
    setSession(value);
    const sess = value ? sessionsById[value] : undefined;
    if (sess) setAmount(centsToDollars(sessionPaymentCents(sess)));
  };

  const onSelectStudent = (value: string) => {
    setStudent(value);
    setSession(NONE); // sessions are per student; reset on student change
  };

  const onSubmit = () => {
    setFormError(null);
    if (!student) return setFormError('Choose a student.');
    const cents = parseDollarsToCents(amount || '0');
    if (cents == null) return setFormError('Enter a valid amount.');
    if (status === 'paid' && !isIsoDate(receivedDate)) {
      return setFormError('A paid payment needs a received date (YYYY-MM-DD).');
    }

    const fields: CreateInput<Payment> = {
      studentId: student as StudentId,
      sessionId: session ? (session as SessionId) : null,
      amount: cents,
      status,
      receivedDate: status === 'paid' ? (receivedDate as IsoDate) : null,
    };

    void submit(
      () => (payment ? update({ id: payment.id, ...fields }) : create(fields)),
      onClose,
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit payment' : 'New payment'}
      footer={
        <HStack gap={theme.space.md} justify="flex-end">
          <Button label="Cancel" variant="ghost" onPress={onClose} disabled={submitting} />
          <Button label={isEdit ? 'Save' : 'Create payment'} variant="primary" onPress={onSubmit} loading={submitting} />
        </HStack>
      }
    >
      <VStack gap={theme.space.lg}>
        {formError ? <Text color="danger">{formError}</Text> : null}

        <Select
          label="Student"
          required
          value={student}
          options={studentOptions}
          onChange={onSelectStudent}
          disabled={isEdit || studentId != null}
        />

        <Select
          label="Session"
          value={session}
          options={sessionOptions}
          onChange={onSelectSession}
          helperText="Pick a session to auto-fill the amount."
        />

        <TextField
          label="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Select label="Status" value={status} options={statusOptions} onChange={setStatus} />

        {status === 'paid' ? (
          <TextField
            label="Received date"
            required
            value={receivedDate}
            onChangeText={setReceivedDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        ) : null}
      </VStack>
    </Modal>
  );
};
