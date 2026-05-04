import * as SecureStore from 'expo-secure-store';
import * as StoreReview from 'expo-store-review';

const KEY_PAYWALL_PROMPTED = 'rate_prompt_paywall_done';
const KEY_FILTERS_SCHEDULED = 'rate_prompt_filters_done';

const FILTER_DELAY_MS = 30_000;

async function tryRequestReview(): Promise<void> {
  try {
    const available = await StoreReview.hasAction();
    if (!available) return;
    await StoreReview.requestReview();
  } catch {
    // iOS rate-limits review prompts. Failures are non-fatal.
  }
}

/**
 * Native rate prompt after the user dismisses the post-onboarding paywall.
 * Fires at most once per install (iOS still rate-limits to 3 per 365 days).
 */
export async function requestReviewAfterPaywall(): Promise<void> {
  const fired = await SecureStore.getItemAsync(KEY_PAYWALL_PROMPTED).catch(() => null);
  if (fired) return;
  await SecureStore.setItemAsync(KEY_PAYWALL_PROMPTED, '1').catch(() => {});
  // Small delay so the paywall sheet finishes dismissing first.
  setTimeout(() => { void tryRequestReview(); }, 600);
}

/**
 * Schedule the rate prompt 30s after the user first changes filters — long
 * enough that they've had time to see the filtered results in action.
 */
export async function scheduleReviewAfterFiltersUsed(): Promise<void> {
  const fired = await SecureStore.getItemAsync(KEY_FILTERS_SCHEDULED).catch(() => null);
  if (fired) return;
  await SecureStore.setItemAsync(KEY_FILTERS_SCHEDULED, '1').catch(() => {});
  setTimeout(() => { void tryRequestReview(); }, FILTER_DELAY_MS);
}
