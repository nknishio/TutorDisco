/**
 * StudentsListScreen — list + search + add. Rows open the student detail screen.
 * Archived students are hidden by default behind a filter toggle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import { useResponsive } from '../../../shared/responsive';
import {
  Badge,
  Button,
  Column,
  DataTable,
  HStack,
  Spinner,
  Text,
  TextField,
  VStack,
} from '../../../shared/ui';
import type { Student, StudentStatus } from '../../../domain/types';
import { formatCents } from '../../../shared/utils/money';
import { useStudentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { StudentFormModal } from '../components/StudentFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentsList'>;

const statusTone = (s: StudentStatus) =>
  s === 'active' ? 'success' : s === 'lead' ? 'info' : s === 'paused' ? 'warning' : 'neutral';

export const StudentsListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { select } = useResponsive();

  const order = useStudentsStore((s) => s.order);
  const byId = useStudentsStore((s) => s.byId);
  const query = useStudentsStore((s) => s.query);
  const status = useStudentsStore((s) => s.status);
  const setQuery = useStudentsStore((s) => s.setQuery);
  const load = useStudentsStore((s) => s.load);

  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return order
      .map((id) => byId[id])
      .filter((s): s is Student => Boolean(s))
      .filter((s) => (showArchived ? true : s.status !== 'archived'))
      .filter((s) =>
        q === ''
          ? true
          : s.name.toLowerCase().includes(q) ||
            (s.email ?? '').toLowerCase().includes(q) ||
            (s.school ?? '').toLowerCase().includes(q),
      );
  }, [order, byId, query, showArchived]);

  const columns: Column<Student>[] = [
    { id: 'name', header: 'Name', flex: 2, render: (s) => <Text variant="bodyStrong">{s.name}</Text> },
    { id: 'grade', header: 'Grade', flex: 1, render: (s) => <Text color="textMuted">{s.gradeLevel ?? '—'}</Text> },
    { id: 'rate', header: 'Rate', flex: 1, align: 'right', render: (s) => <Text color="textMuted">{formatCents(s.defaultHourlyRate)}/hr</Text> },
    { id: 'status', header: 'Status', flex: 1, align: 'right', render: (s) => <Badge label={s.status} tone={statusTone(s.status)} /> },
  ];

  const maxWidth = select({ compact: 9999, expanded: 1080 });
  const loading = status === 'loading' && order.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth, padding: theme.space.lg }}>
        <HStack gap={theme.space.md} justify="space-between" align="center" wrap>
          <View style={{ flex: 1, minWidth: 220 }}>
            <TextField value={query} onChangeText={setQuery} placeholder="Search students…" autoCapitalize="none" />
          </View>
          <HStack gap={theme.space.sm}>
            <Button
              label={showArchived ? 'Hide archived' : 'Show archived'}
              variant="ghost"
              size="sm"
              onPress={() => setShowArchived((v) => !v)}
            />
            <Button label="Revenue" variant="ghost" size="sm" onPress={() => navigation.navigate('RevenueDashboard')} />
            <Button label="Payments" variant="secondary" size="sm" onPress={() => navigation.navigate('Payments')} />
            <Button label="Add student" variant="primary" size="sm" onPress={() => setAddOpen(true)} />
          </HStack>
        </HStack>

        {loading ? (
          <Spinner fill />
        ) : (
          <DataTable
            columns={columns}
            data={visible}
            keyExtractor={(s) => s.id}
            onRowPress={(s) => navigation.navigate('StudentDetail', { studentId: s.id })}
            emptyTitle={query ? 'No matches' : 'No students yet'}
            emptyDescription={query ? 'Try a different search.' : 'Add your first student to get started.'}
          />
        )}
      </VStack>

      <StudentFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
    </ScrollView>
  );
};
