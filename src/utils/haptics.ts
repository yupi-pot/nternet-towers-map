import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Fire-and-forget. Native modules can throw on some emulators or rare
// edge cases (audio session conflicts) — never let that bubble to UI.
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  void fn().catch(() => {});
};

export const tapLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const tapMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const tapSelection = () => safe(() => Haptics.selectionAsync());
export const tapSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const tapWarning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
