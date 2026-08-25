import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { OptionRow } from '@/components/option-row';
import { LANGUAGES, type LanguageCode } from '@/constants/brand';
import { Colors, FontFamily, Radius, Sizing, Spacing, Typography } from '@/constants/design';

export interface LanguagePickerProps {
  selected: LanguageCode | null;
  onSelect: (code: LanguageCode) => void;
}

/**
 * Strips accents so someone typing on an English keyboard can still find
 * "Español" or "Français" — the whole point of the search box is that you
 * don't need the other language's keyboard to reach your language.
 */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Searchable list of the 48 study languages.
 *
 * Matching runs over the native name, the English name AND the language code,
 * so "spanish", "español", "espanol" and "es" all reach the same row.
 */
export function LanguagePicker({ selected, onSelect }: LanguagePickerProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (language) =>
        fold(language.nativeName).includes(q) ||
        fold(language.name).includes(q) ||
        language.code.toLowerCase() === q,
    );
  }, [query]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <MaterialIcons name="search" size={24} color={Colors.subtle} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search languages"
          placeholderTextColor={Colors.subtle}
          selectionColor={Colors.navy}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search languages"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            hitSlop={12}>
            <MaterialIcons name="close" size={24} color={Colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodyLg" color="muted" center>
            No languages match “{query.trim()}”.
          </AppText>
          <AppText variant="bodyMd" color="subtle" center>
            Try the language’s English name, like “Spanish”.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {results.map((language) => (
            <OptionRow
              key={language.code}
              title={language.nativeName}
              trailingLabel={language.name !== language.nativeName ? language.name : undefined}
              selected={selected === language.code}
              checkmark={false}
              onPress={() => onSelect(language.code)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.lg,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: Sizing.inputMin,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
  },
  fieldFocused: {
    borderColor: Colors.navy,
  },
  input: {
    flex: 1,
    // Matches bodyLg so entered text stays large and readable.
    fontFamily: FontFamily.regular,
    fontSize: Typography.bodyLg.fontSize,
    color: Colors.ink,
  },
  list: {
    gap: Spacing.sm,
  },
  empty: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
});
