import { useRef, useState } from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/design';
import { normalizeDigits } from '@/lib/digits';

export interface PinInputProps {
  /** Number of digits. Defaults to 5. */
  length?: number;
  /** Called with the joined digits every time they change. */
  onChange: (pin: string) => void;
  /** Error message shown below; also tints the boxes red. */
  error?: string;
}

/**
 * A PIN field rendered as large separate digit boxes. Typing auto-advances,
 * backspace on an empty box steps back. Digits stay visible (deliberate — this
 * is a low-stakes PIN and visible entry is easier for older users).
 */
export function PinInput({ length = 5, onChange, error }: PinInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const commit = (next: string[]) => {
    setDigits(next);
    onChange(next.join(''));
  };

  const handleChange = (index: number, raw: string) => {
    // normalizeDigits (not \D) so Arabic-Indic/Devanagari/Thai numerals from
    // localized keyboards count as digits instead of being silently dropped.
    const digit = normalizeDigits(raw).slice(-1);
    const next = [...digits];
    next[index] = digit;
    commit(next);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      commit(next);
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.boxes}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            style={[
              styles.box,
              focusedIndex === index && styles.boxFocused,
              error != null && styles.boxError,
            ]}
            accessibilityLabel={`PIN digit ${index + 1} of ${length}`}
            value={digit}
            onChangeText={(text) => handleChange(index, text)}
            onKeyPress={(e) => handleKeyPress(index, e)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            selectionColor={Colors.navy}
          />
        ))}
      </View>
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
  boxes: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  box: {
    flex: 1,
    maxWidth: 64,
    height: 72,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 28,
    color: Colors.navy,
  },
  boxFocused: {
    borderColor: Colors.navy,
  },
  boxError: {
    borderColor: Colors.red,
  },
});
