import { Linking } from 'react-native';
import { adapty, createPaywallView } from 'react-native-adapty';

import { PAYWALL_PLACEMENT } from '@/src/config/adapty';

interface PresentOptions {
  /** Called after a successful purchase. Profile is up to date when this fires. */
  onPurchase?: () => void;
  /** Called after a successful restore. */
  onRestore?: () => void;
  /** Called when the user closes the paywall. */
  onClose?: () => void;
}

/**
 * Imperatively present the Adapty Paywall Builder paywall.
 *
 * Why: Paywall Builder paywalls render via `view.present()` (a native modal),
 * not as React children. There is no `<Modal>` to wrap.
 */
export async function presentPaywall(options: PresentOptions = {}): Promise<void> {
  const paywall = await adapty.getPaywall(PAYWALL_PLACEMENT);

  if (!paywall.hasViewConfiguration) {
    console.warn(
      `Adapty paywall for placement "${PAYWALL_PLACEMENT}" has no view configuration. ` +
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
