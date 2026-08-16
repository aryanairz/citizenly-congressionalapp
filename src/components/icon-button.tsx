import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/design';

export interface IconButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Accessibility label — required; icon-only buttons say nothing otherwise. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 56px navy-bordered circle (for primary arrows) instead of the 48px square. */
  large?: boolean;
}

/** Square/circular icon-only button following the safe Pressable pattern. */
export function IconButton({ icon, label, onPress, disabled = false, large = false }: IconButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={4}>
      <View
        style={[
          styles.base,
          large && styles.large,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <MaterialIcons name={icon} size={large ? 30 : 24} color={Colors.navy} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.navy,
  },
  pressed: {
    backgroundColor: Colors.surfaceMuted,
  },
  disabled: {
    opacity: 0.35,
  },
});
