import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageCode, SUPPORTED_LANGUAGES } from '@/src/i18n';

interface Props {
  visible: boolean;
  /** Currently persisted override, or null when following the device language. */
  selected: LanguageCode | null;
  onClose: () => void;
  onSelect: (code: LanguageCode | null) => void;
}

export default function LanguagePickerModal({ visible, selected, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('settings.languagePickerTitle')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#1c1c1e" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            <Row
              label={t('settings.languagePickerSystemOption')}
              checked={selected === null}
              onPress={() => onSelect(null)}
            />
            {SUPPORTED_LANGUAGES.map((lang) => (
              <Row
                key={lang.code}
                label={lang.native}
                checked={selected === lang.code}
                onPress={() => onSelect(lang.code)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.rowLabel}>{label}</Text>
      {checked && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    maxHeight: '78%',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, marginBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1c1c1e' },
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  rowLabel: { fontSize: 16, color: '#1c1c1e' },
});
