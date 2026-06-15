/**
 * RevenueDashboardScreen — revenue analytics across all students.
 *
 * Headline metrics (total collected, this month, outstanding, lifetime billed), a
 * monthly collected-revenue trend, and a per-student revenue breakdown. All figures
 * derive from payment rows; charts are dependency-free Views.
 */
import React, { useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../../shared/theme';
import {
  BarChart,
  Button,
  Card,
  HStack,
  RankBars,
  Spinner,
  StatCard,
  Text,
  VStack,
} from '../../../shared/ui';
import type { Payment } from '../../../domain/types';
import {
  monthlyRevenueMap,
  paymentTotals,
  revenuePerStudent,
} from '../../../domain/services/payments';
import { formatCents } from '../../../shared/utils/money';
import {
  currentMonthKey,
  formatMonthLong,
  formatMonthShort,
  recentMonthKeys,
} from '../../../shared/utils/datetime';
import { usePaymentsStore, useStudentsStore } from '../../../store';
import type { RootStackParamList } from '../../../app/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RevenueDashboard'>;

const MONTHS_SHOWN = 6;

export const RevenueDashboardScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  const status = usePaymentsStore((s) => s.status);
  const byId = usePaymentsStore((s) => s.byId);
  const order = usePaymentsStore((s) => s.order);
  const loadPayments = usePaymentsStore((s) => s.loadAll);

  const studentsById = useStudentsStore((s) => s.byId);
  const loadStudents = useStudentsStore((s) => s.load);

  useEffect(() => {
    void loadStudents();
    void loadPayments();
  }, [loadStudents, loadPayments]);

  const payments = useMemo(
    () => order.map((id) => byId[id]).filter((p): p is Payment => Boolean(p)),
    [order, byId],
  );

  const totals = useMemo(() => paymentTotals(payments), [payments]);

  const monthSeries = useMemo(() => {
    const map = monthlyRevenueMap(payments);
    return recentMonthKeys(MONTHS_SHOWN).map((key) => ({
      label: formatMonthShort(key),
      value: map.get(key)?.paidCents ?? 0,
    }));
  }, [payments]);

  const thisMonthCents = useMemo(() => {
    const map = monthlyRevenueMap(payments);
    return map.get(currentMonthKey())?.paidCents ?? 0;
  }, [payments]);

  const perStudent = useMemo(
    () =>
      revenuePerStudent(payments)
        .filter((r) => r.billedCents > 0)
        .map((r) => ({
          id: r.studentId as string,
          label: studentsById[r.studentId]?.name ?? 'Unknown',
          value: r.billedCents,
          valueLabel: `${formatCents(r.paidCents)} of ${formatCents(r.billedCents)}`,
        })),
    [payments, studentsById],
  );

  const lifetimeBilled = totals.paidCents + totals.outstandingCents;
  const loading = status === 'loading' && payments.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ alignItems: 'center' }}
    >
      <VStack gap={theme.space.lg} style={{ width: '100%', maxWidth: 1080, padding: theme.space.lg }}>
        <HStack justify="space-between" align="center" wrap gap={theme.space.md}>
          <Text variant="h2">Revenue</Text>
          <Button label="Manage payments" variant="secondary" size="sm" onPress={() => navigation.navigate('Payments')} />
        </HStack>

        {loading ? (
          <Spinner fill />
        ) : (
          <>
            {/* Headline metrics */}
            <HStack gap={theme.space.lg} wrap>
              <StatCard label="Total revenue" value={formatCents(totals.paidCents)} />
              <StatCard label={`This month (${formatMonthShort(currentMonthKey())})`} value={formatCents(thisMonthCents)} />
              <StatCard label="Outstanding" value={formatCents(totals.outstandingCents)} positiveIsGood={false} />
              <StatCard label="Lifetime billed" value={formatCents(lifetimeBilled)} />
            </HStack>

            {/* Monthly revenue trend */}
            <Card
              title="Monthly revenue"
              subtitle={`Collected over the last ${MONTHS_SHOWN} months`}
            >
              <BarChart data={monthSeries} formatValue={(v) => formatCents(v)} tone="primary" />
            </Card>

            {/* Revenue per student */}
            <Card title="Revenue per student" subtitle="Collected of total billed, by student">
              {perStudent.length === 0 ? (
                <Text color="textMuted">No billed payments yet.</Text>
              ) : (
                <RankBars data={perStudent} tone="success" maxRows={12} />
              )}
            </Card>

            {/* Breakdown */}
            <Card title="Breakdown">
              <VStack gap={theme.space.md}>
                <HStack justify="space-between">
                  <Text color="textMuted">Collected ({totals.paidCount})</Text>
                  <Text variant="bodyStrong" color="success">{formatCents(totals.paidCents)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="textMuted">Pending ({totals.pendingCount})</Text>
                  <Text variant="bodyStrong" color="warning">{formatCents(totals.pendingCents)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="textMuted">Overdue ({totals.overdueCount})</Text>
                  <Text variant="bodyStrong" color="danger">{formatCents(totals.overdueCents)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text variant="bodyStrong">Current month ({formatMonthLong(currentMonthKey())})</Text>
                  <Text variant="bodyStrong">{formatCents(thisMonthCents)}</Text>
                </HStack>
              </VStack>
            </Card>
          </>
        )}
      </VStack>
    </ScrollView>
  );
};
