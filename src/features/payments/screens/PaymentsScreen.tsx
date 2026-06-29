/**
 * PaymentsScreen — track money owed and received across all students.
 *
 * Filter by status (pending / paid / overdue), mark a payment paid in one tap, add
 * an ad-hoc payment, or auto-generate pending payments for completed sessions that
 * haven't been billed yet (amount = rate × duration).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import {
  Badge,
  Button,
  Card,
  Column,
  DataTable,
  HStack,
  Spinner,
  StatCard,
  Text,
  VStack,
} from '../../../shared/ui';
import type { BadgeTone } from '../../../shared/ui';
import type { Payment, PaymentStatus } from '../../../domain/types';
import { paymentTotals } from '../../../domain/services/payments';
import { formatCents } from '../../../shared/utils/money';
import { formatIsoDate, todayIsoDate } from '../../../shared/utils/datetime';
import { usePaymentsStore, useSessionsStore, useStudentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';
import { PaymentFormModal } from '../components/PaymentFormModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Payments'>;

type Filter = 'all' | 'pending' | 'paid' | 'overdue';
const FILTERS: readonly Filter[] = ['all', 'pending', 'paid', 'overdue'];

const tone = (s: PaymentStatus): BadgeTone =>
  s === 'paid' ? 'success' : s === 'pending' ? 'warning' : s === 'overdue' ? 'danger' : 'neutral';
const label = (s: PaymentStatus) => s.charAt(0).toUpperCase() + s.slice(1);

export const PaymentsScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  const status = usePaymentsStore((s) => s.status);
  const byId = usePaymentsStore((s) => s.byId);
  const order = usePaymentsStore((s) => s.order);
  const loadPayments = usePaymentsStore((s) => s.loadAll);
  const markPaid = usePaymentsStore((s) => s.markPaid);
  const billSession = usePaymentsStore((s) => s.billSession);
  const removePayment = usePaymentsStore((s) => s.remove);

  const studentsById = useStudentsStore((s) => s.byId);
  const loadStudents = useStudentsStore((s) => s.load);

  const sessionsById = useSessionsStore((s) => s.byId);
  const loadSessions = useSessionsStore((s) => s.loadAll);
  const allSessions = useSessionsStore((s) => s.all);

  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadStudents();
    void loadSessions();
    void loadPayments();
  }, [loadStudents, loadSessions, loadPayments]);

  const payments = useMemo(
    () => order.map((id) => byId[id]).filter((p): p is Payment => Boolean(p)),
    [order, byId],
  );
  const totals = useMemo(() => paymentTotals(payments), [payments]);

  const visible = useMemo(
    () => (filter === 'all' ? payments : payments.filter((p) => p.status === filter)),
    [payments, filter],
  );

  const studentName = (p: Payment) => studentsById[p.studentId]?.name ?? 'Unknown';
  const sessionDate = (p: Payment) => {
    if (!p.sessionId) return 'Ad-hoc';
    const sess = sessionsById[p.sessionId];
    return sess ? formatIsoDate(sess.date) : '—';
  };

  const onGenerate = async () => {
    setNotice(null);
    setGenerating(true);
    const billed = new Set<string>();
    for (const p of payments) if (p.sessionId) billed.add(p.sessionId);
    const toBill = allSessions().filter((s) => s.status === 'completed' && !billed.has(s.id));
    let created = 0;
    for (const sess of toBill) {
      const res = await billSession(sess);
      if (res.ok) created += 1;
    }
    setGenerating(false);
    setNotice(
      created === 0
        ? 'All completed sessions are already billed.'
        : `Created ${created} pending payment${created === 1 ? '' : 's'} from completed sessions.`,
    );
  };

  const columns: Column<Payment>[] = [
    { id: 'student', header: 'Student', flex: 2, render: (p) => <Text variant="bodyStrong">{studentName(p)}</Text> },
    { id: 'session', header: 'Session', flex: 2, render: (p) => <Text color="textMuted">{sessionDate(p)}</Text>, hideOnCompact: true },
    { id: 'amount', header: 'Amount', flex: 1, align: 'right', render: (p) => <Text variant="bodyStrong">{formatCents(p.amount)}</Text> },
    { id: 'status', header: 'Status', flex: 1, align: 'right', render: (p) => <Badge label={label(p.status)} tone={tone(p.status)} /> },
    { id: 'received', header: 'Received', flex: 1, align: 'right', render: (p) => <Text color="textMuted">{p.receivedDate ? formatIsoDate(p.receivedDate) : '—'}</Text> },
    {
      id: 'action',
      header: '',
      flex: 2,
      align: 'right',
      render: (p) => (
        <HStack gap={theme.space.xs} justify="flex-end" align="center">
          {p.status === 'paid' || p.status === 'cancelled' ? null : (
            <Button label="Mark paid" variant="secondary" size="sm" onPress={() => void markPaid(p.id, todayIsoDate())} />
          )}
          <Button
            label="🗑"
            accessibilityLabel="Delete payment"
            variant="ghost"
            size="sm"
            onPress={() => void removePayment(p.id)}
          />
        </HStack>
      ),
    },
  ];

  const loading = status === 'loading' && payments.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth: 1080, padding: theme.space.lg }}>
        {/* Totals */}
        <HStack gap={theme.space.lg} wrap>
          <StatCard label="Collected" value={formatCents(totals.paidCents)} />
          <StatCard label="Outstanding" value={formatCents(totals.outstandingCents)} />
          <StatCard label="Pending" value={String(totals.pendingCount)} />
          <StatCard label="Overdue" value={String(totals.overdueCount)} />
        </HStack>

        {/* Actions */}
        <HStack gap={theme.space.md} justify="space-between" align="center" wrap>
          <HStack gap={theme.space.xs} wrap>
            {FILTERS.map((f) => (
              <Button
                key={f}
                label={f.charAt(0).toUpperCase() + f.slice(1)}
                variant={filter === f ? 'primary' : 'ghost'}
                size="sm"
                onPress={() => setFilter(f)}
              />
            ))}
          </HStack>
          <HStack gap={theme.space.sm}>
            <Button label="Revenue" variant="ghost" size="sm" onPress={() => navigation.navigate('RevenueDashboard')} />
            <Button
              label="Generate from sessions"
              variant="secondary"
              size="sm"
              onPress={onGenerate}
              loading={generating}
            />
            <Button label="Add payment" variant="primary" size="sm" onPress={() => setAddOpen(true)} />
          </HStack>
        </HStack>

        {notice ? (
          <Card elevation="none">
            <Text color="textMuted">{notice}</Text>
          </Card>
        ) : null}

        {loading ? (
          <Spinner fill />
        ) : (
          <DataTable
            columns={columns}
            data={visible}
            keyExtractor={(p) => p.id}
            onRowPress={(p) => setEditing(p)}
            emptyTitle={filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
            emptyDescription="Add a payment or generate them from completed sessions."
          />
        )}
      </VStack>

      <PaymentFormModal visible={addOpen} onClose={() => setAddOpen(false)} />
      <PaymentFormModal
        visible={editing != null}
        onClose={() => setEditing(null)}
        payment={editing ?? undefined}
      />
    </ScrollView>
  );
};
