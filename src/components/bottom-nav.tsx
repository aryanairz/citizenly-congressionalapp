import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Spacing } from '@/constants/design';
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
  const [pressed, setPressed] = useState(false);
  const color = active ? Colors.navy : Colors.muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}>
      <View style={[styles.item, active && styles.itemActive, pressed && styles.pressed]}>
        <MaterialIcons name={tab.icon} size={26} color={color} />
        <AppText variant="labelMd" style={[styles.label, { color }]}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  item: {
    alignItems: 'center',
    gap: 2,
    minWidth: 68,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  itemActive: {
    backgroundColor: Colors.navyTint,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});
