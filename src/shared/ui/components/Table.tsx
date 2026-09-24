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
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react-native';
import { HStack, Icon, Text, VStack } from '../primitives';
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
  /** Show a sort toggle next to this column's header in the wide layout. */
  sortable?: boolean;
}

/** Which column the table is sorted by, and in which direction. */
export interface TableSort {
  columnId: string;
  dir: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  data: ReadonlyArray<T>;
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  /** Active sort (for rendering the arrow state); null when unsorted/default. */
  sort?: TableSort | null;
  /** Called when a sortable column's arrow is pressed. */
  onToggleSort?: (columnId: string) => void;
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
  sort,
  onToggleSort,
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
        {columns.map((col) => {
          const canSort = Boolean(col.sortable && onToggleSort);
          const active = sort?.columnId === col.id;
          const arrow = active ? (sort!.dir === 'desc' ? ArrowDown : ArrowUp) : ChevronsUpDown;
          const headerText = (
            <Text variant="eyebrow" color={active ? 'primaryText' : 'textMuted'}>
              {col.header}
            </Text>
          );
          return (
            <View key={col.id} style={{ flex: col.flex ?? 1, alignItems: alignToFlex(col.align) }}>
              {canSort ? (
                <Pressable
                  onPress={() => onToggleSort!(col.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${col.header}`}
                  // Announced sort state (web: aria-sort on the header control).
                  aria-sort={active ? (sort!.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.space.xs,
                    opacity: hovered ? 0.7 : 1,
                  })}
                >
                  {headerText}
                  <Icon as={arrow} size="sm" color={active ? 'primaryText' : 'textSubtle'} />
                </Pressable>
              ) : (
                headerText
              )}
            </View>
          );
        })}
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
