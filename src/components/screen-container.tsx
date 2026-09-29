import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ScrollEdge } from '@/components/scroll-edge';

import { Colors, Spacing } from '@/constants/design';

export interface ScreenContainerProps {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. Defaults to false. */
  scroll?: boolean;
  /** Apply the global 24px horizontal margins. Defaults to true. */
  padded?: boolean;
  /** Safe-area edges to inset. Defaults to top + bottom. */
  edges?: Edge[];
  /** Pinned to the bottom, outside the scroll area (e.g. a primary CTA). */
  footer?: ReactNode;
  /** Keep content (incl. footer) above the keyboard - use on screens with inputs. */
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Full-screen white canvas for every screen - safe-area aware and edge-to-edge
 * (NOT a floating card on a dark background). Content sits within 24px side
 * margins; the status bar area stays white with dark icons.
 */
export function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  footer,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const pad = padded ? { paddingHorizontal: Spacing.screenX } : null;

  const body = (
    <>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, pad, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, contentContainerStyle]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, pad]}>
          {/* Content fades into the footer instead of being cut by a rule. */}
          <ScrollEdge direction="up" />
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <StatusBar style="dark" />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    paddingTop: Spacing.md,
    backgroundColor: Colors.canvas,
  },
});
