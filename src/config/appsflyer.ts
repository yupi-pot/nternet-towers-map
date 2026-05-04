import { Platform } from 'react-native';
import appsFlyer from 'react-native-appsflyer';
import type { AdaptyPaywallProduct } from 'react-native-adapty';

const DEV_KEY = process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY ?? '';
const APP_ID = process.env.EXPO_PUBLIC_APPSFLYER_APP_ID ?? '';

let initialized = false;

export function initAppsFlyer() {
  if (initialized) return;
  if (!DEV_KEY) return;
  initialized = true;

  appsFlyer.initSdk(
    {
      devKey: DEV_KEY,
      isDebug: __DEV__,
      appId: Platform.OS === 'ios' ? APP_ID : undefined,
      onInstallConversionDataListener: true,
      onDeepLinkListener: true,
      timeToWaitForATTUserAuthorization: 60,
    },
    () => {},
    (error) => {
      console.error('AppsFlyer init failed:', error);
    },
  );
}

export function logSubscriptionPurchase(product: AdaptyPaywallProduct) {
  appsFlyer.logEvent(
    'af_purchase',
    {
      af_revenue: product.price?.amount ?? 0,
      af_currency: product.price?.currencyCode ?? 'USD',
      af_content_id: product.vendorProductId,
      af_quantity: 1,
    },
    () => {},
    (error) => {
      console.error('AppsFlyer af_purchase log failed:', error);
    },
  );
}

export { appsFlyer };
