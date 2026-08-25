import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  LanguagePicker,
  ScreenContainer,
  ScreenHeader,
  StepDots,
} from '@/components';
import { type LanguageCode } from '@/constants/brand';
import { Spacing } from '@/constants/design';
import { useOnboarding } from '@/lib/onboarding-context';

export default function ChooseLanguageScreen() {
  const router = useRouter();
  const { data, update } = useOnboarding();
  const [selected, setSelected] = useState<LanguageCode | null>(data.languageCode);

  const handleContinue = () => {
    if (!selected) return;
    update({ languageCode: selected });
    router.push('/onboarding/exemption');
  };

  return (
    <ScreenContainer
      scroll
      keyboardAvoiding
      footer={<Button label="Continue" onPress={handleContinue} disabled={!selected} />}>
      <ScreenHeader />
      <View style={styles.content}>
        <StepDots total={3} current={0} />
        <AppText variant="headlineLg" color="navy">
          Which language do you want to study in?
        </AppText>
        <LanguagePicker selected={selected} onSelect={setSelected} />
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
  list: {
    gap: Spacing.sm,
  },
});
