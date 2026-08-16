import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View, type ViewStyle, type StyleProp } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, FontFamily, Radius, Sizing, Spacing, Typography } from '@/constants/design';

export interface InputProps extends TextInputProps {
  /** Always-visible bold label above the field (never a floating placeholder). */
  label: string;
  /** Error message shown below; also switches the border to red. */
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Text field with a permanent bold label and a large 64px tap target. Border is
 * neutral by default, navy on focus, red on error — and errors are announced in
 * text (not color alone).
 */
export function Input({ label, error, containerStyle, onFocus, onBlur, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? Colors.red : focused ? Colors.navy : Colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="labelLg" color="navy">
        {label}
      </AppText>
      <TextInput
        style={[styles.input, { borderColor }, style]}
        placeholderTextColor={Colors.subtle}
        selectionColor={Colors.navy}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="bodyMd" color="red">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  input: {
    minHeight: Sizing.inputMin,
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    color: Colors.ink,
    // Match bodyLg (18px) so entered text is large and readable.
    fontFamily: FontFamily.regular,
    fontSize: Typography.bodyLg.fontSize,
  },
});
