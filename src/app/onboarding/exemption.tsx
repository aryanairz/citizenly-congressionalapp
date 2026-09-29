import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, OptionRow, ScreenContainer, ScreenHeader, StepDots } from '@/components';
import { EXEMPTIONS, type ExemptionChoice } from '@/constants/exemptions';
import { Spacing } from '@/constants/design';
import { useOnboarding } from '@/lib/onboarding-context';

export default function ExemptionScreen() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState<ExemptionChoice | null>(data.exemption);

  const handleContinue = () => {
    if (!selected) return;
    update({ exemption: selected });
    router.push('/onboarding/state');
  };

  return (
    <ScreenContainer
      scroll
      footer={<Button label="Continue" onPress={handleContinue} disabled={!selected} />}>
      <ScreenHeader />
      <View style={styles.content}>
        <StepDots total={3} current={1} />
        <View style={styles.headingGroup}>
          <AppText variant="display" color="navy">
            Do you qualify for a language exemption?
          </AppText>
          <AppText variant="bodyMd" color="muted">
            Select the option that best describes your situation.
          </AppText>
        </View>
        <View style={styles.list}>
          {EXEMPTIONS.map((option) => (
            <OptionRow
              key={option.id}
              title={option.title}
              description={option.description}
              selected={selected === option.id}
              checkmark={false}
              onPress={() => setSelected(option.id)}
            />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  headingGroup: {
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
});
