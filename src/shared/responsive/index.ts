/**
 * Responsive system — breakpoints by width, not platform (architecture.md §8).
 *
 * A desktop browser narrowed to phone width behaves like a phone. The same hook
 * drives adaptive layouts and the navigation shell (tabs vs. sidebar).
 */
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'medium' | 'expanded';

/** Min-width (px) where each breakpoint begins. */
export const BREAKPOINTS: Record<Breakpoint, number> = {
  compact: 0, // phones
  medium: 768, // tablets / small windows
  expanded: 1024, // desktop browsers
};

export const breakpointForWidth = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
};

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  /** At least tablet width. */
  isAtLeastMedium: boolean;
  /**
   * Pick a value for the active breakpoint, falling back down the ladder
   * (expanded → medium → compact) so only `compact` is strictly required.
   */
  select<T>(values: { compact: T; medium?: T; expanded?: T }): T;
}

export const useResponsive = (): ResponsiveInfo => {
  const { width, height } = useWindowDimensions();
  const breakpoint = breakpointForWidth(width);

  return {
    width,
    height,
    breakpoint,
    isCompact: breakpoint === 'compact',
    isMedium: breakpoint === 'medium',
    isExpanded: breakpoint === 'expanded',
    isAtLeastMedium: breakpoint !== 'compact',
    select(values) {
      if (breakpoint === 'expanded') return values.expanded ?? values.medium ?? values.compact;
      if (breakpoint === 'medium') return values.medium ?? values.compact;
      return values.compact;
    },
  };
};
