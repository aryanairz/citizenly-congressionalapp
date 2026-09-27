/**
 * Cross-platform confirmation dialog.
 *
 * `Alert.alert` is a **silent no-op on React Native Web** - it doesn't throw,
 * it just never appears. Any button whose only action sits inside an Alert
 * callback therefore does nothing at all on web, which reads as a broken
 * button and violates the project rule that every button works.
 *
 * This routes to `window.confirm` on web and `Alert.alert` on native, and
 * hands back a promise either way so callers read the same on both.
 */

import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label for the affirmative button. Defaults to "OK". */
  confirmLabel?: string;
  /** Label for the dismissive button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Styles the affirmative button as destructive on iOS. */
  destructive?: boolean;
}

/** Resolves true when the user confirms, false when they dismiss. */
export function confirmAction({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    // window.confirm has no custom labels, so fold the message in with the
    // title to keep the whole question visible.
    const body = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(body));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** A message with a single acknowledgement, e.g. "PIN changed". */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
