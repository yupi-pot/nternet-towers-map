import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePremium } from '@/src/context/PremiumContext';

const FEATURES = [
  { icon: '∞', label: 'Unlimited towers on map', sub: 'Free shows nearest 10' },
  { icon: '🧭', label: 'Compass bearing to tower', sub: 'Perfect for antenna pointing' },
  { icon: '📡', label: 'Carrier filter', sub: 'Show only your carrier' },
  { icon: '📤', label: 'Export tower list', sub: 'CSV / JSON for field work' },
  { icon: '📊', label: 'Live signal strength', sub: 'Real dBm from your device' },
  { icon: '🏠', label: 'Home screen widget', sub: 'Nearest tower at a glance' },
];

interface Props {
  visible: boolean;
  featureName?: string;
  onClose: () => void;
}

export default function PaywallModal({ visible, featureName, onClose }: Props) {
  const { activatePremium } = usePremium();

  const handleTrial = async () => {
    // TODO: Replace with actual IAP purchase call
    await activatePremium();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.pill} />
          </View>

          <View style={styles.crownWrap}>
            <Text style={styles.crown}>👑</Text>
          </View>
          <Text style={styles.title}>Cellr Premium</Text>
          {featureName ? (
            <Text style={styles.subtitle}>
              <Text style={styles.featureName}>{featureName}</Text> is a premium feature
            </Text>
          ) : (
            <Text style={styles.subtitle}>Unlock the full experience</Text>
          )}

          {/* Feature list */}
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={styles.pricingRow}>
            <View style={styles.pricingOption}>
              <Text style={styles.pricingAmount}>$4.99</Text>
              <Text style={styles.pricingPeriod}>/ month</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={[styles.pricingOption, styles.pricingBest]}>
              <View style={styles.bestBadge}>
                <Text style={styles.bestBadgeText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.pricingAmount, { color: '#3b82f6' }]}>$29.99</Text>
              <Text style={[styles.pricingPeriod, { color: '#3b82f6' }]}>/ year</Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.trialBtn} onPress={handleTrial} activeOpacity={0.85}>
            <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
          </TouchableOpacity>

          <Text style={styles.legal}>
            Cancel anytime · No charge during trial · Billed after 7 days
          </Text>

          <TouchableOpacity onPress={onClose} style={styles.noThanks}>
            <Text style={styles.noThanksText}>No thanks</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', paddingTop: 12, marginBottom: 4 },
  pill: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  crownWrap: { alignItems: 'center', marginTop: 16, marginBottom: 4 },
  crown: { fontSize: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  featureName: { fontWeight: '700', color: '#1e293b' },

  featureList: { gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  featureSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  pricingRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pricingOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  pricingBest: { backgroundColor: '#eff6ff' },
  pricingDivider: { width: 1.5, backgroundColor: '#e2e8f0' },
  bestBadge: {
    position: 'absolute',
    top: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  pricingAmount: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginTop: 18 },
  pricingPeriod: { fontSize: 12, color: '#64748b', marginTop: 2 },

  trialBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  trialBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  legal: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 12 },
  noThanks: { alignItems: 'center', paddingVertical: 4 },
  noThanksText: { fontSize: 14, color: '#94a3b8' },
});
