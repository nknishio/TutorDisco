/**
 * SessionFormModal — create or edit a session.
 *
 * Scheduling uses a month-view calendar for the date (no typing) plus typable start
 * time and duration fields and an optional location. A calendar section adds/updates/
 * removes the matching event through the active CalendarProvider; the event title
 * follows SAT Mode ("{Name} SAT Tutor" vs "{Name} Tutoring"). Calendar failures never
 * block saving the session.
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
import { buildEventTitle } from '../../../domain/services/calendar';
import { isIsoDate, isIsoTime } from '../../../shared/utils/time';
import { parseDollarsToCents } from '../../../shared/utils/money';
import { formatIsoDate, formatIsoTime, todayIsoDate } from '../../../shared/utils/datetime';
import { useFormSubmit } from '../../../shared/hooks';
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
  const [addToCalendarOnSave, setAddToCalendarOnSave] = useState(!isEdit);

  const { submitting, error: formError, setError: setFormError, submit } = useFormSubmit();

  // Default the session title to the SAT-aware convention for new sessions.
  useEffect(() => {
    setTitle(session?.title ?? buildEventTitle(studentName, satMode));
    // Only when the form is (re)opened for a given session/student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, studentName, visible]);

  // Re-sync the form whenever it (re)opens or the target session / student defaults
  // change. useState initializers only run on first mount, but this modal stays mounted
  // and is just toggled visible — so without this, edits to the student's default rate or
  // duration never reach the "Add session" form (it would keep the stale mount-time value).
  useEffect(() => {
    if (!visible) return;
    setDate(session?.date ?? todayIsoDate());
    setStartTime(session?.startTime ?? '15:00');
    setDuration(String(session?.duration ?? defaultDuration));
    setRate(
      session
        ? (session.hourlyRate / 100).toFixed(2)
        : defaultRateCents != null
          ? (defaultRateCents / 100).toFixed(2)
          : '',
    );
    setLocation(session?.location ?? '');
    setNotes(session?.notes ?? '');
    setStatus(session?.status ?? 'scheduled');
    setAddToCalendarOnSave(!session);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, session, defaultDuration, defaultRateCents]);

  useEffect(() => {
    if (!visible) return;
    void loadSettings();
    if (session) void loadLink(session.id);
  }, [visible, session, loadSettings, loadLink]);

  const rateCents = useMemo(() => parseDollarsToCents(rate || '0'), [rate]);
  const durationNum = Math.round(Number(duration));

  const providerOptions = CALENDAR_PROVIDER_OPTIONS.map((p) => ({ label: p.label, value: p.id }));
  const eventTitle = buildEventTitle(studentName, satMode);
  const isBusy = busySessionId != null;

  const buildFields = (): CreateInput<Session> => ({
    studentId,
    title: title.trim() || eventTitle,
    date: date as IsoDate,
    startTime: startTime as IsoTime,
    duration: durationNum,
    hourlyRate: rateCents as Cents,
    location: location.trim() || null,
    status,
    notes: notes.trim() || null,
  });

  const onSubmit = () => {
    setFormError(null);
    if (!isIsoDate(date)) return setFormError('Pick a valid date.');
    if (!isIsoTime(startTime)) return setFormError('Enter a start time as HH:mm (24h).');
    if (!Number.isFinite(durationNum) || durationNum <= 0) return setFormError('Enter a valid duration.');
    if (rateCents == null) return setFormError('Enter a valid hourly rate.');

    const fields = buildFields();

    void submit(
      () => (session ? update({ id: session.id, ...fields }) : create(fields)),
      async (saved) => {
        // Calendar sync — best-effort, never blocks the save.
        const ctx = { studentName, satMode };
        if (session) {
          await syncOnEdit(saved, ctx); // updates the event if one is linked
        } else if (addToCalendarOnSave) {
          await addToCalendar(saved, ctx);
        }
        onClose();
      },
    );
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

        {/* Time + duration (typable) */}
        <HStack gap={theme.space.lg}>
          <VStack flex={1}>
            <TextField
              label="Start time"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:mm"
              autoCapitalize="none"
            />
          </VStack>
          <VStack flex={1}>
            <TextField
              label="Duration (min)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="60"
            />
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
