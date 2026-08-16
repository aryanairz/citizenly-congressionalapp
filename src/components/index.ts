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
export { OfflineNotice } from '@/components/offline-notice';
export {
  OptionCard,
  FeedbackPanel,
  shuffledIndices,
  LETTERS,
  type OptionVisual,
} from '@/components/quiz-ui';
export { StateDistrictPicker } from '@/components/state-district-picker';
