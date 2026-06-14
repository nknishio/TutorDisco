/**
 * Modal — responsive: a centered dialog on tablet/desktop, a bottom sheet on phones.
 * Backdrop press and an explicit close control both dismiss. Content scrolls.
 *
 * The backdrop is an absolutely-positioned sibling BEHIND the panel (not a wrapper),
 * so taps on the panel — including TextInputs — reach their target directly. Wrapping
 * inputs in a Pressable steals the touch and blurs the field on iOS. The content
 * ScrollView uses keyboardShouldPersistTaps="handled" so tapping a field (or another
 * control) while the keyboard is up doesn't dismiss it.
 */
import React, { type PropsWithChildren, type ReactNode } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../responsive';
import { HStack, Text } from '../primitives';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  footer?: ReactNode;
  /** Max dialog width on tablet/desktop. */
  maxWidth?: number;
  testID?: string;
}

export const Modal = ({
  visible,
  onClose,
  title,
  footer,
  maxWidth = 520,
  children,
  testID,
}: PropsWithChildren<ModalProps>) => {
  const theme = useTheme();
  const { isCompact } = useResponsive();

  const panel: ViewStyle = isCompact
    ? {
        width: '100%',
        maxHeight: '85%',
        borderTopLeftRadius: theme.radii.xl,
        borderTopRightRadius: theme.radii.xl,
      }
    : {
        width: '100%',
        maxWidth,
        maxHeight: '85%',
        borderRadius: theme.radii.xl,
      };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={isCompact ? 'slide' : 'fade'}
      onRequestClose={onClose}
      testID={testID}
    >
      <View
        style={{
          flex: 1,
          justifyContent: isCompact ? 'flex-end' : 'center',
          alignItems: 'center',
          padding: isCompact ? 0 : theme.space.xl,
        }}
      >
        {/* Backdrop — sibling behind the panel; tap to dismiss. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]}
        />

        {/* Panel — plain View on top; receives input touches directly. */}
        <View
          style={[
            {
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.lg,
            },
            panel,
          ]}
        >
          {title ? (
            <HStack
              justify="space-between"
              align="center"
              style={{
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.lg,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Text variant="h3">{title}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Text variant="h3" color="textMuted">
                  ×
                </Text>
              </Pressable>
            </HStack>
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: theme.space.xl }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              style={{
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
};
