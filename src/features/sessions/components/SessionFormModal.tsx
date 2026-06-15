/**
 * SessionFormModal — create or edit a session.
 *
 * Scheduling is fully visual: a month-view calendar for the date (no typing), a time
 * picker for the start, a duration selector, and an optional location. Expected payment
 * is computed live. A calendar section adds/updates/removes the matching event through
 * the active CalendarProvider; the event title follows SAT Mode ("{Name} SAT Tutor" vs
 * "{Name} Tutoring"). Calendar failures never block saving the session.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import {
  Button,
  CalendarPicker,
  HStack,
  Modal,
  Select,
  Switch,
  TextField,
  TimePicker,
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
import { buildEventTitle } from '../../../domain/services/calendar';
import { isIsoDate, isIsoTime } from '../../../shared/utils/time';
import { parseDollarsToCents, formatCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, todayIsoDate } from '../../../shared/utils/datetime';
import {
  CALENDAR_PROVIDER_OPTIONS,
  useCalendarStore,
  useSessionsStore,
  useSettingsStore,
  useStudentsStore,
} from '../../../store';

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

const DURATION_PRESETS = [30, 45, 60, 90, 120];

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

  const studentName = useStudentsStore((s) => s.byId[studentId]?.name) ?? 'Student';

  const satMode = useSettingsStore((s) => s.satMode);
  const loadSettings = useSettingsStore((s) => s.load);
  const setSatMode = useSettingsStore((s) => s.setSatMode);

  const providerId = useCalendarStore((s) => s.providerId);
  const setProvider = useCalendarStore((s) => s.setProvider);
  const loadLink = useCalendarStore((s) => s.loadLink);
  const link = useCalendarStore((s) => (session ? s.linksBySession[session.id] : undefined));
  const calendarError = useCalendarStore((s) => s.error);
  const busySessionId = useCalendarStore((s) => s.busySessionId);
  const addToCalendar = useCalendarStore((s) => s.addToCalendar);
  const syncOnEdit = useCalendarStore((s) => s.syncOnEdit);
  const removeFromCalendar = useCalendarStore((s) => s.removeFromCalendar);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(session?.date ?? todayIsoDate());
  const [startTime, setStartTime] = useState<string>(session?.startTime ?? '15:00');
  const [duration, setDuration] = useState(session?.duration ?? defaultDuration);
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
  const [addToCalendarOnSave, setAddToCalendarOnSave] = useState(!isEdit);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Default the session title to the SAT-aware convention for new sessions.
  useEffect(() => {
    setTitle(session?.title ?? buildEventTitle(studentName, satMode));
    // Only when the form is (re)opened for a given session/student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, studentName, visible]);

  useEffect(() => {
    if (!visible) return;
    void loadSettings();
    if (session) void loadLink(session.id);
  }, [visible, session, loadSettings, loadLink]);

  const rateCents = useMemo(() => parseDollarsToCents(rate || '0'), [rate]);

  const expected = useMemo(() => {
    if (rateCents == null || duration <= 0) return null;
    return expectedPaymentCents(rateCents, duration);
  }, [rateCents, duration]);

  const durationOptions = useMemo(() => {
    const values = DURATION_PRESETS.includes(duration) ? DURATION_PRESETS : [...DURATION_PRESETS, duration].sort((a, b) => a - b);
    return values.map((m) => ({ label: m % 60 === 0 ? `${m / 60} hr` : `${m} min`, value: m }));
  }, [duration]);

  const providerOptions = CALENDAR_PROVIDER_OPTIONS.map((p) => ({ label: p.label, value: p.id }));
  const eventTitle = buildEventTitle(studentName, satMode);
  const isBusy = busySessionId != null;

  const buildFields = (): CreateInput<Session> => ({
    studentId,
    title: title.trim() || eventTitle,
    date: date as IsoDate,
    startTime: startTime as IsoTime,
    duration,
    hourlyRate: rateCents as Cents,
    location: location.trim() || null,
    status,
    notes: notes.trim() || null,
  });

  const onSubmit = async () => {
    setFormError(null);
    if (!isIsoDate(date)) return setFormError('Pick a valid date.');
    if (!isIsoTime(startTime)) return setFormError('Pick a valid start time.');
    if (duration <= 0) return setFormError('Choose a duration.');
    if (rateCents == null) return setFormError('Enter a valid hourly rate.');

    const fields = buildFields();

    setSubmitting(true);
    const res = session ? await update({ id: session.id, ...fields }) : await create(fields);

    if (!res.ok) {
      setSubmitting(false);
      return setFormError(res.error.message);
    }

    // Calendar sync — best-effort, never blocks the save.
    const ctx = { studentName, satMode };
    if (session) {
      await syncOnEdit(res.value, ctx); // updates the event if one is linked
    } else if (addToCalendarOnSave) {
      await addToCalendar(res.value, ctx);
    }

    setSubmitting(false);
    onClose();
  };

  const onAddExisting = async () => {
    if (!session) return;
    await addToCalendar({ ...session, ...buildFields() } as Session, { studentName, satMode });
  };

  const onRemove = async () => {
    if (!session) return;
    await removeFromCalendar(session);
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

        <TextField label="Title" value={title} onChangeText={setTitle} />

        {/* Visual date picker */}
        <VStack gap={theme.space.sm}>
          <HStack justify="space-between" align="center">
            <Text variant="label" color="textMuted">Date</Text>
            <Text variant="bodyStrong">{formatIsoDate(date)}</Text>
          </HStack>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              padding: theme.space.md,
              backgroundColor: theme.colors.surface,
            }}
          >
            <CalendarPicker value={date} onChange={setDate} />
          </View>
        </VStack>

        {/* Time + duration */}
        <HStack gap={theme.space.lg} align="flex-start">
          <VStack flex={1}>
            <TimePicker label="Start time" value={startTime} onChange={setStartTime} />
          </VStack>
          <VStack flex={1}>
            <Select label="Duration" value={duration} options={durationOptions} onChange={setDuration} />
          </VStack>
        </HStack>

        <HStack gap={theme.space.lg}>
          <VStack flex={1}>
            <TextField label="Hourly rate ($)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0.00" />
          </VStack>
          <VStack flex={1}>
            <TextField label="Location (optional)" value={location} onChangeText={setLocation} placeholder="Online, library, …" />
          </VStack>
        </HStack>

        {isEdit ? <Select label="Status" value={status} options={statusOptions} onChange={setStatus} /> : null}
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        {/* Expected payment — computed live */}
        <HStack
          justify="space-between"
          align="center"
          style={{ backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radii.md, padding: theme.space.lg }}
        >
          <Text variant="label" color="textMuted">Expected payment</Text>
          <Text variant="h3">{expected != null ? formatCents(expected) : '—'}</Text>
        </HStack>

        {/* Calendar section */}
        <VStack
          gap={theme.space.md}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
            padding: theme.space.lg,
          }}
        >
          <Text variant="bodyStrong">Calendar</Text>

          <Switch
            label="SAT Mode"
            description="Titles events “{Name} SAT Tutor” instead of “{Name} Tutoring”."
            value={satMode}
            onValueChange={(v) => void setSatMode(v)}
          />

          <HStack justify="space-between" align="center">
            <Text color="textMuted">Event title</Text>
            <Text variant="bodyStrong">{eventTitle}</Text>
          </HStack>

          <Select
            label="Provider"
            value={providerId}
            options={providerOptions}
            onChange={(id) => setProvider(id)}
          />

          {calendarError ? <Text color="danger">{calendarError}</Text> : null}

          {isEdit ? (
            link ? (
              <HStack justify="space-between" align="center" gap={theme.space.md}>
                <VStack gap={2} flex={1}>
                  <Text color="success" variant="bodyStrong">Linked to calendar</Text>
                  <Text variant="caption" color="textMuted">
                    {`Synced ${formatIsoDate(date)} · ${formatIsoTime(startTime)}`}
                  </Text>
                </VStack>
                <Button label="Remove" variant="danger" size="sm" onPress={onRemove} loading={isBusy} />
              </HStack>
            ) : (
              <Button label="Add to calendar" variant="secondary" onPress={onAddExisting} loading={isBusy} />
            )
          ) : (
            <Switch
              label="Add to calendar on save"
              value={addToCalendarOnSave}
              onValueChange={setAddToCalendarOnSave}
            />
          )}
        </VStack>
      </VStack>
    </Modal>
  );
};
