import { Linking } from 'react-native';
import { adapty, createPaywallView } from 'react-native-adapty';

import { PLACEMENTS, type PlacementId } from '@/src/config/adapty';

export type PaywallTrigger = keyof typeof PLACEMENTS;

interface PresentOptions {
  /** Called after a successful purchase. Profile is up to date when this fires. */
  onPurchase?: () => void;
  /** Called after a successful restore. */
  onRestore?: () => void;
  /** Called when the user closes the paywall. */
  onClose?: () => void;
}

/**
 * Imperatively present an Adapty Paywall Builder paywall.
 *
 * Why: Paywall Builder paywalls render via `view.present()` (a native modal),
 * not as React children. There is no `<Modal>` to wrap.
 */
export async function presentPaywall(
  trigger: PaywallTrigger,
  options: PresentOptions = {},
): Promise<void> {
  const placementId: PlacementId = PLACEMENTS[trigger];

  const paywall = await adapty.getPaywall(placementId);

  if (!paywall.hasViewConfiguration) {
    console.warn(
      `Adapty paywall for placement "${placementId}" has no view configuration. ` +
        `Toggle "Show on device" on in the Paywall Builder.`,
    );
    return;
  }

  const view = await createPaywallView(paywall);

  view.setEventHandlers({
    onCloseButtonPress() {
      options.onClose?.();
      return true;
    },
    onUrlPress(url) {
      Linking.openURL(url);
    },
    onPurchaseCompleted() {
      options.onPurchase?.();
    },
    onRestoreCompleted() {
      options.onRestore?.();
    },
  });

  await view.present();
}
