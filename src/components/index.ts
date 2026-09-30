/**
 * Shared UI foundation. Import screen building blocks from here:
 *   import { ScreenContainer, AppText, Button, Input, Card, ListRow } from '@/components';
 */

export { AppText, type AppTextProps } from '@/components/app-text';
export { Button, type ButtonProps } from '@/components/button';
export { ScreenContainer, type ScreenContainerProps } from '@/components/screen-container';
export { Input, type InputProps } from '@/components/input';
export { Card, ListRow, Divider, type CardProps, type ListRowProps, type DividerProps } from '@/components/card';
export { ScreenHeader, type ScreenHeaderProps } from '@/components/screen-header';
export { StepDots, type StepDotsProps } from '@/components/step-dots';
export { OptionRow, type OptionRowProps } from '@/components/option-row';
export { PinInput, type PinInputProps } from '@/components/pin-input';
export { BottomNav, type BottomNavProps, type BottomNavTab } from '@/components/bottom-nav';
export { IconButton, type IconButtonProps } from '@/components/icon-button';
export { ReadAloudButton, type ReadAloudButtonProps } from '@/components/read-aloud-button';
export { PressableSurface, type PressableSurfaceProps } from '@/components/pressable-surface';
export { ProgressBar, type ProgressBarProps } from '@/components/progress-bar';
export { ScrollEdge, type ScrollEdgeProps } from '@/components/scroll-edge';
export {
  OptionCard,
  FeedbackPanel,
  shuffledIndices,
  useGradedOptionReveal,
  LETTERS,
  type OptionVisual,
} from '@/components/quiz-ui';
export { StateDistrictPicker } from '@/components/state-district-picker';
export { LanguagePicker, type LanguagePickerProps } from '@/components/language-picker';
