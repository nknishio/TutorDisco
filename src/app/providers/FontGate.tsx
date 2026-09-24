/**
 * FontGate — loads the bundled Plus Jakarta Sans (UI) and Newsreader (display) faces before the tree
 * renders, so text never flashes in the fallback face. A load error still lets the app
 * through: text then falls back to the platform font rather than blocking the UI.
 */
import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
// Per-weight subpath imports: the package index would bundle every weight and italic.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { useTheme } from '../../shared/theme';
import { Spinner } from '../../shared/ui/feedback';

export const FontGate = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });

  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Spinner size="large" />
      </View>
    );
  }
  return <>{children}</>;
};
