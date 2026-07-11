/**
 * DraggableList — a reorderable table that mirrors DataTable's layout.
 *
 * Renders the same header + columns (wide) or stacked cards (compact) as DataTable, but
 * with a leading drag handle (≡) per row. Grabbing the handle lifts the row; as it moves,
 * the other rows glide aside (spring-animated, LinkedIn-style) and on release the new
 * order is reported. Touching the row body still fires `onRowPress`.
 *
 * Built on core react-native `PanResponder` + `Animated` (no gesture/animation dependency),
 * so it runs on iOS, Android and react-native-web. Row positions are measured via
 * `onLayout` rather than assumed fixed, so variable-height rows (compact cards) reorder
 * correctly. `Animated` runs on the JS driver (`useNativeDriver: false`) for web parity.
 * It does not auto-scroll when dragging past the viewport edge — fine for the lists here.
 */
import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';
import { HStack, Text, VStack } from '../primitives';
import type { Column } from './Table';

export interface DraggableListProps<T> {
  data: ReadonlyArray<T>;
  keyExtractor: (item: T) => string;
  /** Called with the full list of keys in their new top-to-bottom order. */
  onReorder: (orderedKeys: string[]) => void;
  onRowPress?: (item: T) => void;
  /**
   * Table mode: render the same header + columns as DataTable, with a leading drag
   * handle. Ignored when `renderItem` is given.
   */
  columns?: ReadonlyArray<Column<T>>;
  /**
   * Card mode: render each item however you like. You receive a ready-made drag handle
   * node to place within your content, and whether this item is currently being dragged.
   * Takes precedence over `columns`.
   */
  renderItem?: (item: T, dragHandle: ReactNode, isActive: boolean) => ReactNode;
  /** Gap between items in card mode (default `theme.space.md`). */
  gap?: number;
  testID?: string;
}

const HANDLE_WIDTH = 40;

const alignToFlex = (a: Column<unknown>['align']): ViewStyle['alignItems'] =>
  a === 'right' ? 'flex-end' : a === 'center' ? 'center' : 'flex-start';

const alignToJustify = (a: Column<unknown>['align']): ViewStyle['justifyContent'] =>
  a === 'right' ? 'flex-end' : a === 'center' ? 'center' : 'flex-start';

const renderCell = (node: ReactNode): ReactNode =>
  typeof node === 'string' || typeof node === 'number' ? <Text>{node}</Text> : node;

export function DraggableList<T>({
  data,
  keyExtractor,
  onReorder,
  onRowPress,
  columns,
  renderItem,
  gap,
  testID,
}: DraggableListProps<T>) {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  // Only the active-drag flag drives re-renders; the moment-to-moment motion is animated
  // imperatively through the Animated.Values below, so a drag re-renders just twice.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  // Measured top offset + height of each row within the container (pre-transform).
  const layouts = useRef<Array<{ y: number; h: number } | undefined>>([]);
  // translateY of the lifted row (follows the finger).
  const pan = useRef(new Animated.Value(0)).current;
  // translateY of every row's "make room" shift.
  const shifts = useMemo(
    () => data.map(() => new Animated.Value(0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.length],
  );

  const dataRef = useRef(data);
  dataRef.current = data;
  const keyRef = useRef(keyExtractor);
  keyRef.current = keyExtractor;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const resetMotion = () => {
    activeIndexRef.current = null;
    overIndexRef.current = null;
    setActiveIndex(null);
    pan.setValue(0);
    shifts.forEach((v) => v.setValue(0));
  };

  const centerOf = (k: number): number => {
    const l = layouts.current[k];
    return l ? l.y + l.h / 2 : 0;
  };

  // Slide non-dragged rows to open a gap at `target`, by exactly the dragged row's height.
  const animateShifts = (from: number, target: number) => {
    const h = layouts.current[from]?.h ?? 0;
    const anims = shifts.map((value, k) => {
      let to = 0;
      if (from < target && k > from && k <= target) to = -h;
      else if (from > target && k >= target && k < from) to = h;
      return Animated.spring(value, { toValue: to, useNativeDriver: false, bounciness: 0, speed: 20 });
    });
    Animated.parallel(anims).start();
  };

  const responders = useMemo(
    () =>
      data.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onStartShouldSetPanResponderCapture: () => true,
          onMoveShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponderCapture: () => true,
          // Once the handle is pressed, keep the gesture until release — don't let the
          // parent ScrollView (or anything) steal it, so dragging continues wherever the
          // cursor/finger goes (LinkedIn-style press-and-hold).
          onPanResponderTerminationRequest: () => false,
          onShouldBlockNativeResponder: () => true,
          onPanResponderGrant: () => {
            activeIndexRef.current = index;
            overIndexRef.current = index;
            setActiveIndex(index);
            pan.setValue(0);
            shifts.forEach((v) => v.setValue(0));
          },
          onPanResponderMove: (_evt, g) => {
            const from = activeIndexRef.current;
            if (from == null) return;
            pan.setValue(g.dy);
            const center = centerOf(from) + g.dy;
            let target = from;
            for (let k = from + 1; k < dataRef.current.length; k++) {
              if (center > centerOf(k)) target = k;
              else break;
            }
            for (let k = from - 1; k >= 0; k--) {
              if (center < centerOf(k)) target = k;
              else break;
            }
            if (target !== overIndexRef.current) {
              overIndexRef.current = target;
              animateShifts(from, target);
            }
          },
          onPanResponderRelease: () => {
            const from = activeIndexRef.current;
            const target = overIndexRef.current;
            if (from == null || target == null) return resetMotion();
            // Glide the lifted row to its resting slot, then commit and reset transforms.
            let resting = 0;
            if (from < target) for (let k = from + 1; k <= target; k++) resting += layouts.current[k]?.h ?? 0;
            else if (from > target) for (let k = target; k < from; k++) resting -= layouts.current[k]?.h ?? 0;
            Animated.spring(pan, { toValue: resting, useNativeDriver: false, bounciness: 0, speed: 20 }).start(() => {
              if (from !== target) {
                const keys = dataRef.current.map((item) => keyRef.current(item));
                const [moved] = keys.splice(from, 1);
                if (moved !== undefined) keys.splice(target, 0, moved);
                onReorderRef.current(keys);
              }
              resetMotion();
            });
          },
          onPanResponderTerminate: resetMotion,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.length],
  );

  const isDragging = activeIndex !== null;

  const handle = (index: number, label: string) => (
    <View
      {...responders[index]!.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Drag to reorder"
      style={{
        width: HANDLE_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
      }}
    >
      <Text color="textMuted" variant="bodyStrong">
        ≡
      </Text>
      {label ? (
        <Text color="textSubtle" variant="caption">
          {label}
        </Text>
      ) : null}
    </View>
  );

  const draggedRowStyle = (index: number): ViewStyle =>
    index === activeIndex
      ? {
          zIndex: 10,
          backgroundColor: theme.colors.surfaceHover,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }
      : { zIndex: 1, backgroundColor: theme.colors.surface };

  const setLayout = (index: number) => (e: { nativeEvent: { layout: { y: number; height: number } } }) => {
    layouts.current[index] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
  };

  // A compact grab handle (no fixed gutter) for callers to place inside their own content.
  const grabHandle = (index: number) => (
    <View
      {...responders[index]!.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Drag to reorder"
      style={{ paddingHorizontal: theme.space.xs, paddingVertical: theme.space.xs, justifyContent: 'center' }}
    >
      <Text color="textMuted" variant="bodyStrong">
        ≡
      </Text>
    </View>
  );

  // -------- Card mode: caller renders each item, places the provided handle --------
  if (renderItem) {
    const g = gap ?? theme.space.md;
    return (
      <View testID={testID}>
        {data.map((row, index) => (
          <Animated.View
            key={keyExtractor(row)}
            onLayout={setLayout(index)}
            style={{
              marginBottom: index === data.length - 1 ? 0 : g,
              transform: [{ translateY: index === activeIndex ? pan : shifts[index]! }],
              zIndex: index === activeIndex ? 10 : 1,
              ...(index === activeIndex
                ? { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 }
                : null),
            }}
          >
            {renderItem(row, grabHandle(index), index === activeIndex)}
          </Animated.View>
        ))}
      </View>
    );
  }

  const cols = columns ?? [];

  // -------- Compact: stacked cards --------
  if (isCompact) {
    return (
      <View testID={testID}>
        {data.map((row, index) => (
          <Animated.View
            key={keyExtractor(row)}
            onLayout={setLayout(index)}
            style={[
              {
                marginBottom: index === data.length - 1 ? 0 : theme.space.md,
                transform: [{ translateY: index === activeIndex ? pan : shifts[index]! }],
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
              draggedRowStyle(index),
            ]}
          >
            <VStack gap={theme.space.sm} style={{ padding: theme.space.lg }}>
              <HStack align="center" gap={theme.space.sm}>
                {handle(index, 'Drag')}
                <View style={{ flex: 1 }} />
              </HStack>
              <Pressable disabled={isDragging} onPress={() => onRowPress?.(row)} accessibilityRole="button">
                <VStack gap={theme.space.sm}>
                  {cols
                    .filter((c) => !c.hideOnCompact)
                    .map((col) => (
                      <HStack key={col.id} justify="space-between" align="center" gap={theme.space.md}>
                        <Text variant="label" color="textMuted">
                          {col.header}
                        </Text>
                        <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{renderCell(col.render(row))}</View>
                      </HStack>
                    ))}
                </VStack>
              </Pressable>
            </VStack>
          </Animated.View>
        ))}
      </View>
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
          paddingRight: theme.space.lg,
          paddingVertical: theme.space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ width: HANDLE_WIDTH }} />
        {cols.map((col) => (
          <View key={col.id} style={{ flex: col.flex ?? 1, alignItems: alignToFlex(col.align) }}>
            <Text variant="caption" color="textMuted">
              {col.header.toUpperCase()}
            </Text>
          </View>
        ))}
      </HStack>

      {data.map((row, index) => (
        <Animated.View
          key={keyExtractor(row)}
          onLayout={setLayout(index)}
          style={[
            {
              transform: [{ translateY: index === activeIndex ? pan : shifts[index]! }],
              borderBottomWidth: index === data.length - 1 ? 0 : 1,
              borderBottomColor: theme.colors.border,
            },
            draggedRowStyle(index),
          ]}
        >
          <HStack align="center" style={{ paddingRight: theme.space.lg, paddingVertical: theme.space.md }}>
            {handle(index, '')}
            <Pressable
              disabled={isDragging}
              onPress={() => onRowPress?.(row)}
              accessibilityRole="button"
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            >
              {cols.map((col) => (
                <View
                  key={col.id}
                  style={{ flex: col.flex ?? 1, flexDirection: 'row', justifyContent: alignToJustify(col.align) }}
                >
                  {renderCell(col.render(row))}
                </View>
              ))}
            </Pressable>
          </HStack>
        </Animated.View>
      ))}
    </View>
  );
}
