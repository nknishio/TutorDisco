/**
 * DataTable — responsive, generic, typed table.
 *
 * On tablet/desktop it renders a header row + aligned columns. On phones it
 * collapses each record into a stacked "label: value" card, which is the standard
 * pattern for data tables on narrow screens. Columns are declared once and reused
 * across both layouts.
 */
import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';
import { HStack, Text, VStack } from '../primitives';
import { EmptyState } from '../feedback/EmptyState';

export interface Column<T> {
  id: string;
  header: string;
  /** Flex weight of the column in the wide layout. */
  flex?: number;
  align?: 'left' | 'right' | 'center';
  /** Cell renderer. Return a string for plain text or any node for custom cells. */
  render: (row: T) => ReactNode;
  /** Hide this column in the compact (stacked) layout. */
  hideOnCompact?: boolean;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  testID?: string;
}

const alignToFlex = (a: Column<unknown>['align']): ViewStyle['alignItems'] =>
  a === 'right' ? 'flex-end' : a === 'center' ? 'center' : 'flex-start';

const alignToJustify = (a: Column<unknown>['align']): ViewStyle['justifyContent'] =>
  a === 'right' ? 'flex-end' : a === 'center' ? 'center' : 'flex-start';

const renderCell = (node: ReactNode): ReactNode =>
  typeof node === 'string' || typeof node === 'number' ? <Text>{node}</Text> : node;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  testID,
}: DataTableProps<T>) {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  // -------- Compact: stacked cards --------
  if (isCompact) {
    return (
      <VStack gap={theme.space.md} testID={testID}>
        {data.map((row) => {
          const card = (
            <VStack
              gap={theme.space.sm}
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
                padding: theme.space.lg,
              }}
            >
              {columns
                .filter((c) => !c.hideOnCompact)
                .map((col) => (
                  <HStack key={col.id} justify="space-between" align="center" gap={theme.space.md}>
                    <Text variant="label" color="textMuted">
                      {col.header}
                    </Text>
                    <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
                      {renderCell(col.render(row))}
                    </View>
                  </HStack>
                ))}
            </VStack>
          );
          return onRowPress ? (
            <Pressable key={keyExtractor(row)} onPress={() => onRowPress(row)} accessibilityRole="button">
              {card}
            </Pressable>
          ) : (
            <View key={keyExtractor(row)}>{card}</View>
          );
        })}
      </VStack>
    );
  }

  // -------- Wide: header + rows --------
  return (
    <View
      testID={testID}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
      }}
    >
      <HStack
        style={{
          backgroundColor: theme.colors.surfaceMuted,
          paddingHorizontal: theme.space.lg,
          paddingVertical: theme.space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {columns.map((col) => (
          <View key={col.id} style={{ flex: col.flex ?? 1, alignItems: alignToFlex(col.align) }}>
            <Text variant="caption" color="textMuted">
              {col.header.toUpperCase()}
            </Text>
          </View>
        ))}
      </HStack>

      <ScrollView>
        {data.map((row, i) => {
          const cells = (
            <HStack
              align="center"
              style={{
                paddingHorizontal: theme.space.lg,
                paddingVertical: theme.space.md,
                borderBottomWidth: i === data.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              {columns.map((col) => (
                <View key={col.id} style={{ flex: col.flex ?? 1, flexDirection: 'row', justifyContent: alignToJustify(col.align) }}>
                  {renderCell(col.render(row))}
                </View>
              ))}
            </HStack>
          );
          return onRowPress ? (
            <Pressable
              key={keyExtractor(row)}
              onPress={() => onRowPress(row)}
              accessibilityRole="button"
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) =>
                hovered ? { backgroundColor: theme.colors.surfaceHover } : null
              }
            >
              {cells}
            </Pressable>
          ) : (
            <View key={keyExtractor(row)}>{cells}</View>
          );
        })}
      </ScrollView>
    </View>
  );
}
