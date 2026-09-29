import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { PressableSurface } from '@/components/pressable-surface';
import { ScrollEdge } from '@/components/scroll-edge';
import { Colors, Elevation, Radius, Spacing } from '@/constants/design';
import { SPRING } from '@/constants/motion';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

export type BottomNavTab = 'home' | 'profile';

interface TabSpec {
  key: BottomNavTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const TABS: TabSpec[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'profile', label: 'Profile', icon: 'person' },
];

export interface BottomNavProps {
  /** Highlighted tab; omit when the current screen isn't a tab destination. */
  active?: BottomNavTab;
}

/**
 * The app's bottom tab bar: labeled icons, active tab highlighted with a
 * navy-tinted pill. Flat with a hairline top border, per the design system.
 * Navigation is built in: Home → Dashboard, Profile → Profile screen.
 */
export function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const lang = useLang();

  const handlePress = (tab: BottomNavTab) => {
    if (tab === active) return; // already here
    if (tab === 'home') router.replace('/dashboard');
    if (tab === 'profile') router.push('/profile');
  };

  return (
    <View style={styles.bar}>
      {/* Content dissolves into the bar rather than being cut off by a rule. */}
      <ScrollEdge direction="up" />
      {TABS.map((tab) => (
        <NavItem
          key={tab.key}
          // 'Profile' has no website translation yet - stays English for now.
          label={tab.key === 'home' ? t('home', lang) : tab.label}
          tab={tab}
          active={tab.key === active}
          onPress={() => handlePress(tab.key)}
        />
      ))}
    </View>
  );
}

/**
 * The pill behind the active tab grows into place rather than blinking on, so
 * switching tabs reads as one object moving instead of two states swapping.
 */
function NavItem({
  tab,
  label,
  active,
  onPress,
}: {
  tab: TabSpec;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? Colors.navy : Colors.muted;
  const fill = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    fill.value = withSpring(active ? 1 : 0, SPRING);
  }, [active, fill]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    transform: [{ scale: 0.9 + fill.value * 0.1 }],
  }));

  return (
    <PressableSurface
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      weight="control">
      <View style={styles.item}>
        <Animated.View style={[styles.pill, pillStyle]} />
        <MaterialIcons name={tab.icon} size={26} color={color} />
        <AppText variant="labelMd" style={[styles.label, { color }]}>
          {label}
        </AppText>
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.canvas,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    // Depth instead of a hairline rule: the bar reads as floating above the
    // content rather than being fenced off from it by a line.
    ...Elevation.chrome,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 68,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.navyTint,
    borderRadius: Radius.lg,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
