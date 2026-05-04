export const ADAPTY_PUBLIC_KEY = 'public_live_0eXNNeyO.7W1cZFZw7nqFKEL56LQV';

export const ACCESS_LEVEL_ID = 'premium';

export const PLACEMENTS = {
  onboarding: 'onboarding',
  settings: 'settings',
  featureGate: 'feature_gate',
} as const;

export type PlacementId = (typeof PLACEMENTS)[keyof typeof PLACEMENTS];
