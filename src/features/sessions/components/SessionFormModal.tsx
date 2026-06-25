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
import { Pressable, View } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Button,
  CalendarPicker,
  HStack,
  Modal,
  Select,
  Switch,
  TextField,
  TimeField,
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
  useChecklistStore,
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

/** Calendar reminder presets, in minutes before the start. */
const ALERT_PRESETS: readonly number[] = [0, 5, 10, 15, 30, 60, 120, 1440];

const alertLabel = (minutes: number): string => {
  if (minutes === 0) return 'At time of event';
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? '' : 's'} before`;
  }
  const d = minutes / 1440;
  return `${d} day${d === 1 ? '' : 's'} before`;
};

export const SessionFormModal = ({
  visible,
  onClose,
  studentId,
  session,
  defaultDuration = 60,
  defaultRateCents,
}: SessionFormModalProps) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const isEdit = Boolean(session);
  const create = useSessionsStore((s) => s.create);
  const update = useSessionsStore((s) => s.update);

  const studentName = useStudentsStore((s) => s.byId[studentId]?.name) ?? 'Student';

  const satMode = useSettingsStore((s) => s.satMode);
  const loadSettings = useSettingsStore((s) => s.load);
  const setSatMode = useSettingsStore((s) => s.setSatMode);
  const defaultChecklistItems = useSettingsStore((s) => s.defaultChecklistItems);
  const setDefaultChecklistItems = useSettingsStore((s) => s.setDefaultChecklistItems);
  const defaultCalendarAlerts = useSettingsStore((s) => s.defaultCalendarAlerts);
  const setDefaultCalendarAlerts = useSettingsStore((s) => s.setDefaultCalendarAlerts);

  const createChecklistItem = useChecklistStore((s) => s.create);

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

  // Default-checklist UI state (create only): which defaults to skip for this session,
  // and the draft text for adding a new app-wide default.
  const [skippedChecklist, setSkippedChecklist] = useState<Record<string, boolean>>({});
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Calendar alerts (minutes before start) for this session. Initialized from the
  // app-wide defaults, then left alone once the user touches them for this session.
  const [selectedAlerts, setSelectedAlerts] = useState<number[]>([]);
  const [alertsTouched, setAlertsTouched] = useState(false);

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
    setSkippedChecklist({});
    setNewChecklistItem('');
    setAlertsTouched(false);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, session, defaultDuration, defaultRateCents]);

  // Seed this session's alerts from the app-wide defaults until the user changes them.
  // (Defaults may arrive after open, once settings finish loading.)
  useEffect(() => {
    if (!visible || alertsTouched) return;
    setSelectedAlerts([...defaultCalendarAlerts]);
  }, [visible, alertsTouched, defaultCalendarAlerts]);

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

  // --- default checklist (create only) ------------------------------------
  const selectedDefaultItems = defaultChecklistItems.filter((item) => !skippedChecklist[item]);

  const addDefaultItem = () => {
    const text = newChecklistItem.trim();
    setNewChecklistItem('');
    if (!text || defaultChecklistItems.includes(text)) return;
    void setDefaultChecklistItems([...defaultChecklistItems, text]);
  };

  const removeDefaultItem = (item: string) => {
    void setDefaultChecklistItems(defaultChecklistItems.filter((x) => x !== item));
    setSkippedChecklist((prev) => {
      const next = { ...prev };
      delete next[item];
      return next;
    });
  };

  const toggleDefaultItem = (item: string) =>
    setSkippedChecklist((prev) => ({ ...prev, [item]: !prev[item] }));

  // --- calendar alerts ----------------------------------------------------
  const toggleAlert = (minutes: number) => {
    setAlertsTouched(true);
    setSelectedAlerts((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes],
    );
  };
  const alertsAreDefault =
    selectedAlerts.length === defaultCalendarAlerts.length &&
    [...selectedAlerts].sort((a, b) => a - b).every((m, i) => m === [...defaultCalendarAlerts].sort((a, b) => a - b)[i]);

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
        // New session: attach the selected default checklist items (best-effort).
        if (!session) {
          for (const text of selectedDefaultItems) {
            await createChecklistItem({ sessionId: saved.id, text, completed: false });
          }
        }
        // Calendar sync — best-effort, never blocks the save.
        const ctx = { studentName, satMode, alarms: selectedAlerts };
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
    await addToCalendar({ ...session, ...buildFields() } as Session, { studentName, satMode, alarms: selectedAlerts });
  };

  const onRemove = async () => {
    if (!session) return;
    await removeFromCalendar(session);
  };

  // Scheduling fields, defined once and arranged differently per breakpoint.
  const dateField = (
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
  );
  const startField = <TimeField label="Start time" value={startTime} onChange={setStartTime} />;
  const durationField = (
    <TextField label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="60" />
  );
  const rateField = (
    <TextField label="Hourly rate ($)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="0.00" />
  );
  const locationField = (
    <TextField label="Location (optional)" value={location} onChangeText={setLocation} placeholder="Online, library, …" />
  );
  const statusField = isEdit ? (
    <Select label="Status" value={status} options={statusOptions} onChange={setStatus} />
  ) : null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit session' : 'New session'}
      maxWidth={880}
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

        {isCompact ? (
          // Phone: stacked, with two-up rows.
          <VStack gap={theme.space.lg}>
            {dateField}
            <HStack gap={theme.space.lg}>
              <VStack flex={1}>{startField}</VStack>
              <VStack flex={1}>{durationField}</VStack>
            </HStack>
            <HStack gap={theme.space.lg}>
              <VStack flex={1}>{rateField}</VStack>
              <VStack flex={1}>{locationField}</VStack>
            </HStack>
            {statusField}
          </VStack>
        ) : (
          // Web/tablet: calendar on the left, scheduling fields on the right.
          <HStack gap={theme.space.lg} align="flex-start">
            <View style={{ flex: 1 }}>{dateField}</View>
            <VStack flex={1} gap={theme.space.lg}>
              {startField}
              {durationField}
              {rateField}
              {locationField}
              {statusField}
            </VStack>
          </HStack>
        )}

        {/* Default checklist — applied to new sessions; customizable here. */}
        {!isEdit ? (
          <VStack
            gap={theme.space.md}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.lg,
              padding: theme.space.lg,
            }}
          >
            <VStack gap={2}>
              <Text variant="bodyStrong">Session checklist</Text>
              <Text variant="caption" color="textMuted">
                Applied to every new session. Uncheck to skip one this time, or add your own default.
              </Text>
            </VStack>

            {defaultChecklistItems.length === 0 ? (
              <Text variant="caption" color="textMuted">No default items yet. Add one below.</Text>
            ) : (
              <VStack gap={theme.space.sm}>
                {defaultChecklistItems.map((item) => {
                  const included = !skippedChecklist[item];
                  return (
                    <HStack key={item} gap={theme.space.md} align="center">
                      <Pressable
                        onPress={() => toggleDefaultItem(item)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: included }}
                        accessibilityLabel={item}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: theme.radii.sm,
                          borderWidth: 2,
                          borderColor: included ? theme.colors.primary : theme.colors.borderStrong,
                          backgroundColor: included ? theme.colors.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {included ? <Text style={{ color: theme.colors.onPrimary }}>✓</Text> : null}
                      </Pressable>
                      <Text
                        style={[
                          { flex: 1 },
                          included ? null : { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
                        ]}
                      >
                        {item}
                      </Text>
                      <Button label="Remove" variant="ghost" size="sm" onPress={() => removeDefaultItem(item)} />
                    </HStack>
                  );
                })}
              </VStack>
            )}

            <HStack gap={theme.space.sm} align="center">
              <View style={{ flex: 1 }}>
                <TextField
                  value={newChecklistItem}
                  onChangeText={setNewChecklistItem}
                  placeholder="Add a default checklist item…"
                />
              </View>
              <Button label="Add" variant="secondary" onPress={addDefaultItem} />
            </HStack>
          </VStack>
        ) : null}

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

          {/* Alerts / reminders */}
          <VStack gap={theme.space.sm}>
            <Text variant="label" color="textMuted">Alerts</Text>
            <HStack gap={theme.space.sm} wrap>
              {ALERT_PRESETS.map((minutes) => {
                const on = selectedAlerts.includes(minutes);
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => toggleAlert(minutes)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={alertLabel(minutes)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: theme.space.md,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      borderColor: on ? theme.colors.primary : theme.colors.border,
                      backgroundColor: on ? theme.colors.primary : 'transparent',
                    }}
                  >
                    <Text style={{ color: on ? theme.colors.onPrimary : theme.colors.text }}>
                      {alertLabel(minutes)}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
            {alertsAreDefault ? (
              <Text variant="caption" color="textMuted">Using your default alerts.</Text>
            ) : (
              <HStack>
                <Button
                  label="Save as default alerts"
                  variant="ghost"
                  size="sm"
                  onPress={() => void setDefaultCalendarAlerts(selectedAlerts)}
                />
              </HStack>
            )}
          </VStack>

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

        {/* Notes — kept below the calendar setup. */}
        <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </VStack>
    </Modal>
  );
};
