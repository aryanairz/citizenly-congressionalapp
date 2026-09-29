import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PressableSurface } from '@/components/pressable-surface';
import { Colors, Radius } from '@/constants/design';

export interface IconButtonProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Accessibility label - required; icon-only buttons say nothing otherwise. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 56px navy-bordered circle (for primary arrows) instead of the 48px square. */
  large?: boolean;
}

/**
 * Square/circular icon-only button. Hit slop pads the target past its visual
 * bounds, so the thing you can hit is larger than the thing you can see - the
 * icon stays quiet without the target getting hard to land on.
 */
export function IconButton({ icon, label, onPress, disabled = false, large = false }: IconButtonProps) {
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      weight="control"
      hitSlop={10}>
      <View style={[styles.base, large && styles.large, disabled && styles.disabled]}>
        <MaterialIcons name={icon} size={large ? 30 : 24} color={Colors.navy} />
      </View>
    </PressableSurface>
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
  disabled: {
    opacity: 0.35,
  },
});
