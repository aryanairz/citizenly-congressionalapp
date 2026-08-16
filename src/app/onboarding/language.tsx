import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, OptionRow, ScreenContainer, ScreenHeader, StepDots } from '@/components';
import { LANGUAGES, type LanguageCode } from '@/constants/brand';
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
      footer={<Button label="Continue" onPress={handleContinue} disabled={!selected} />}>
      <ScreenHeader />
      <View style={styles.content}>
        <StepDots total={3} current={0} />
        <AppText variant="headlineLg" color="navy">
          Which language do you want to study in?
        </AppText>
        <View style={styles.list}>
          {LANGUAGES.map((language) => (
            <OptionRow
              key={language.code}
              title={language.nativeName}
              trailingLabel={language.name !== language.nativeName ? language.name : undefined}
              selected={selected === language.code}
              checkmark={false}
              onPress={() => setSelected(language.code)}
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
  list: {
    gap: Spacing.sm,
  },
});
