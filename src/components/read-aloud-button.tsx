import { IconButton } from '@/components/icon-button';
import { canSpeak, speak, stopSpeaking, useSpeaking } from '@/lib/speech';
import { t } from '@/lib/ui-i18n';
import { useLang } from '@/lib/use-lang';

export interface ReadAloudButtonProps {
  /** What to read. Pass the already-localized text, not a key. */
  text: string;
  /** 56px circle instead of the 48px square - for primary placements. */
  large?: boolean;
}

/**
 * Speaker button that reads study content aloud in the user's study language.
 *
 * Renders nothing when the language has no voice available (Hmong, Haitian
 * Creole, Slovenian) - a button that silently does nothing, or reads Khmer
 * text in an English voice, is worse than no button at all.
 *
 * While speaking it becomes a stop button, so a long explanation can be cut
 * short without waiting it out.
 */
export function ReadAloudButton({ text, large = false }: ReadAloudButtonProps) {
  const lang = useLang();
  const speaking = useSpeaking();

  if (!canSpeak(lang)) return null;

  return (
    <IconButton
      icon={speaking ? 'stop' : 'volume-up'}
      label={speaking ? t('stopReading', lang) : t('readAloud', lang)}
      large={large}
      onPress={() => {
        if (speaking) stopSpeaking();
        else speak(text, lang);
      }}
    />
  );
}
