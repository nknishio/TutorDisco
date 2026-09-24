/**
 * Menu — an anchored overflow menu for secondary actions (row "…" menus, sort
 * options). Opens beside its trigger, clamped to the window; tapping outside or
 * choosing an item closes it. Destructive items are set in the danger color and
 * separated from the rest by a rule. `checked` items show a check (for choices
 * such as the active sort).
 *
 * Web: trigger presses call `stopPropagation`, so a Menu inside a pressable row
 * doesn't also fire the row's press.
 */
import React, { useRef, useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Check, MoreHorizontal, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Icon, Text } from '../primitives';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  destructive?: boolean;
  checked?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  items: ReadonlyArray<MenuItem>;
  /** Optional heading inside the menu (e.g. "Sort by"). */
  title?: string;
  /** Custom trigger; receives `open`. Defaults to a "…" icon button. */
  renderTrigger?: (open: (e?: GestureResponderEvent) => void) => React.ReactNode;
  /** Label for the default trigger. */
  accessibilityLabel?: string;
  testID?: string;
}

const MENU_WIDTH = 224;

export const Menu = ({ items, title, renderTrigger, accessibilityLabel = 'More actions', testID }: MenuProps) => {
  const theme = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const anchor = useRef<View>(null);
  const [pos, setPos] = useState<{ x: number; y: number; h: number } | null>(null);

  const open = (e?: GestureResponderEvent) => {
    e?.stopPropagation?.();
    anchor.current?.measureInWindow((x, y, _w, h) => setPos({ x: x + _w, y, h }));
  };
  const close = () => setPos(null);

  const regular = items.filter((i) => !i.destructive);
  const destructive = items.filter((i) => i.destructive);
  const estHeight = (title ? 32 : 0) + items.length * 40 + (destructive.length && regular.length ? 9 : 0) + 8;

  // Right-align the menu to the trigger; flip above when it would overflow the bottom.
  const left = pos ? Math.max(8, Math.min(pos.x - MENU_WIDTH, winW - MENU_WIDTH - 8)) : 0;
  const below = pos ? pos.y + pos.h + 4 : 0;
  const top = pos ? (below + estHeight > winH - 8 ? Math.max(8, pos.y - estHeight - 4) : below) : 0;

  const renderItem = (item: MenuItem) => (
    <Pressable
      key={item.label}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ disabled: item.disabled, checked: item.checked }}
      onPress={() => {
        close();
        item.onSelect();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm + 2,
        height: 40,
        paddingHorizontal: theme.space.md,
        borderRadius: theme.radii.sm,
        backgroundColor: pressed ? theme.colors.surfaceActive : hovered ? theme.colors.surfaceHover : 'transparent',
        opacity: item.disabled ? 0.45 : 1,
      })}
    >
      {item.icon ? <Icon as={item.icon} size="sm" color={item.destructive ? 'danger' : 'textMuted'} /> : null}
      <Text color={item.destructive ? 'danger' : 'text'} style={{ flex: 1 }} numberOfLines={1}>
        {item.label}
      </Text>
      {item.checked ? <Icon as={Check} size="sm" color="primaryText" /> : null}
    </Pressable>
  );

  return (
    <>
      <View ref={anchor} collapsable={false} testID={testID}>
        {renderTrigger ? (
          renderTrigger(open)
        ) : (
          <Pressable
            onPress={open}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded: Boolean(pos) }}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
              width: 32,
              height: 32,
              borderRadius: theme.radii.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? theme.colors.surfaceActive : hovered || pos ? theme.colors.surfaceHover : 'transparent',
            })}
          >
            <Icon as={MoreHorizontal} size="md" />
          </Pressable>
        )}
      </View>

      <RNModal visible={Boolean(pos)} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close menu">
          <View
            accessibilityRole="menu"
            // Swallow presses inside the panel so they don't hit the backdrop.
            onStartShouldSetResponder={() => true}
            style={{
              position: 'absolute',
              top,
              left,
              width: MENU_WIDTH,
              padding: theme.space.xs,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              ...theme.shadows.md,
            }}
          >
            {title ? (
              <Text variant="eyebrow" color="textMuted" style={{ paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm }}>
                {title}
              </Text>
            ) : null}
            {regular.map(renderItem)}
            {destructive.length && regular.length ? (
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.space.xs }} />
            ) : null}
            {destructive.map(renderItem)}
          </View>
        </Pressable>
      </RNModal>
    </>
  );
};
