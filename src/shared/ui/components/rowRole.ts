/**
 * Accessibility role for a pressable ROW (table row, list row, card) that may hold
 * its own buttons. react-native-web renders `accessibilityRole="button"` as a real
 * <button>, and a <button> can't contain another — invalid HTML and confusing to
 * screen readers. On web such rows stay a focusable <div> (Tab + Enter still
 * activate them); native keeps the button role.
 */
import { Platform } from 'react-native';

export const rowRole = Platform.OS === 'web' ? undefined : ('button' as const);
