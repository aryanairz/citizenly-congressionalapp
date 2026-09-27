import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { OptionRow } from '@/components/option-row';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { US_STATES, type USPlace } from '@/constants/us-states';
import { Colors, FontFamily, Radius, Sizing, Spacing } from '@/constants/design';
import { normalizeDigits } from '@/lib/digits';

const FIND_REP_URL = 'https://www.house.gov/representatives/find-your-representative';

export interface StateDistrictPickerProps {
  /** Rendered above the search field (back header, step dots, heading, …). */
  header: ReactNode;
  /** Preselected place code + district (e.g. when editing an existing profile). */
  initialCode?: string | null;
  initialDistrict?: number | null;
  submitLabel: string;
  submitting?: boolean;
  /** Server-side error shown above the submit button. */
  serverError?: string;
  /**
   * Called with a valid selection. District semantics match onboarding:
   * null = skipped/not applicable; 0 = at-large auto-assignment.
   */
  onSubmit: (place: USPlace, district: number | null) => void;
}

/**
 * The shared state + congressional-district picker, as a two-step flow:
 *
 *   1. "state" - the caller's header, a search field, and the full-height
 *      state list. Tapping a state advances immediately.
 *   2. "district" - its own page: back arrow (returns to the list), the
 *      chosen state (tap to change), the district question when the state
 *      has one, and the submit button.
 *
 * Used by onboarding's State step and the Profile location editor so
 * behavior can never drift between them.
 */
export function StateDistrictPicker({
  header,
  initialCode,
  initialDistrict,
  submitLabel,
  submitting = false,
  serverError,
  onSubmit,
}: StateDistrictPickerProps) {
  const [step, setStep] = useState<'state' | 'district'>('state');
  const [selected, setSelected] = useState<USPlace | null>(
    US_STATES.find((place) => place.code === initialCode) ?? null,
  );
  const [districtText, setDistrictText] = useState(
    initialDistrict && initialDistrict > 0 ? initialDistrict.toString() : '',
  );
  const [districtError, setDistrictError] = useState<string | undefined>();
  const [query, setQuery] = useState('');

  const filtered = US_STATES.filter((place) =>
    place.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // How many districts the selected place has (0 for DC/territories).
  const districtCap = selected && selected.kind === undefined ? (selected.districtCount ?? 0) : 0;
  // Only ask when there's an actual choice; at-large states (1 district) and
  // DC/territories skip the question entirely.
  const districtApplies = districtCap > 1;

  const handleSelect = (place: USPlace) => {
    Keyboard.dismiss();
    if (place.code !== selected?.code) {
      setDistrictText('');
      setDistrictError(undefined);
    }
    setSelected(place);
    setStep('district');
  };

  const backToStates = () => {
    Keyboard.dismiss();
    setStep('state');
  };

  const handleSubmit = () => {
    if (!selected || submitting) return;

    let district: number | null = null;
    if (districtApplies && districtText) {
      const parsed = Number.parseInt(districtText, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > districtCap) {
        setDistrictError(
          `${selected.name} has ${districtCap} congressional districts. Please check your district number, or leave this blank if you're not sure.`,
        );
        return;
      }
      district = parsed;
    }
    // At-large states have one statewide representative stored at district 0 -
    // record it automatically so their representative question still appears.
    if (districtCap === 1) district = 0;

    onSubmit(selected, district);
  };

  if (step === 'district' && selected) {
    return (
      <ScreenContainer
        keyboardAvoiding
        footer={
          <View style={styles.footer}>
            {serverError ? (
              <AppText variant="bodyMd" center style={styles.serverError}>
                {serverError}
              </AppText>
            ) : null}
            <Button label={submitLabel} onPress={handleSubmit} loading={submitting} />
          </View>
        }>
        {/* Tapping anywhere outside the input dismisses the keyboard. */}
        <Pressable accessible={false} onPress={Keyboard.dismiss}>
          <ScreenHeader onBack={backToStates} />
          <View style={styles.districtTop}>
            <AppText variant="headlineLg" color="navy">
              Your congressional district
            </AppText>
            <OptionRow
              title={selected.name}
              trailingLabel="Change"
              selected
              checkmark={false}
              onPress={backToStates}
            />
          </View>
          <View style={styles.districtArea}>
            {districtApplies ? (
              <>
                <Input
                  label="Congressional District (Optional)"
                  value={districtText}
                  onChangeText={(text) => {
                    setDistrictText(normalizeDigits(text));
                    setDistrictError(undefined);
                  }}
                  placeholder={`1 to ${districtCap}`}
                  keyboardType="number-pad"
                  maxLength={2}
                  error={districtError}
                />
                {/* The error (rendered by Input) replaces the helper line. */}
                {!districtError ? (
                  <AppText variant="bodyMd" color="muted">
                    This helps us show you questions about your U.S. Representative. Skip it
                    if you&apos;re not sure.
                  </AppText>
                ) : null}
                <FindRepresentativeLink />
              </>
            ) : (
              <AppText variant="bodyMd" color="muted">
                {districtCap === 1
                  ? `${selected.name} has one statewide representative, so there's no district number to enter.`
                  : `${selected.name} doesn't use congressional district numbers, so there's nothing to enter here.`}
              </AppText>
            )}
          </View>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Tapping anywhere in the fixed header area dismisses the keyboard. */}
      <Pressable accessible={false} onPress={Keyboard.dismiss}>
        {header}
        <View style={styles.searchWrap}>
          <SearchField value={query} onChange={setQuery} />
        </View>
      </Pressable>
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {filtered.map((place) => (
          <OptionRow
            key={place.code}
            title={place.name}
            selected={selected?.code === place.code}
            onPress={() => handleSelect(place)}
          />
        ))}
        {filtered.length === 0 ? (
          <AppText variant="bodyLg" color="muted" center style={styles.empty}>
            No states match &ldquo;{query.trim()}&rdquo;. Please check the spelling.
          </AppText>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/** Opens house.gov's district lookup in the in-app browser. */
function FindRepresentativeLink() {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Find your representative on house.gov"
      onPress={() => WebBrowser.openBrowserAsync(FIND_REP_URL)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}>
      <View style={[styles.repLink, pressed && styles.repLinkPressed]}>
        <AppText variant="labelMd" color="navy" style={styles.repLinkText}>
          Find your representative
        </AppText>
        <MaterialIcons name="open-in-new" size={16} color={Colors.navy} />
      </View>
    </Pressable>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [clearPressed, setClearPressed] = useState(false);

  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <MaterialIcons name="search" size={24} color={Colors.muted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="Search states"
        placeholderTextColor={Colors.subtle}
        selectionColor={Colors.navy}
        autoCorrect={false}
        accessibilityLabel="Search states"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          onPressIn={() => setClearPressed(true)}
          onPressOut={() => setClearPressed(false)}
          hitSlop={8}>
          <View style={clearPressed && styles.clearPressed}>
            <MaterialIcons name="close" size={24} color={Colors.muted} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingBottom: Spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Sizing.inputMin,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
  },
  searchFocused: {
    borderColor: Colors.navy,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Colors.ink,
    paddingVertical: Spacing.sm,
  },
  clearPressed: {
    opacity: 0.5,
  },
  listScroll: {
    flex: 1,
    // Bleed to the screen edge so the scroll area feels natural, but keep the
    // rows aligned with the 24px content margins.
    marginHorizontal: -Spacing.screenX,
  },
  list: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenX,
    paddingBottom: Spacing.xl,
  },
  empty: {
    paddingTop: Spacing.xl,
  },
  districtTop: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  districtArea: {
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  repLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  repLinkPressed: {
    opacity: 0.6,
  },
  repLinkText: {
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  footer: {
    gap: Spacing.sm,
  },
  serverError: {
    color: Colors.red,
  },
});
