import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useLocation } from '@/src/hooks/useLocation';
import { useTowers } from '@/src/hooks/useTowers';
import { CellTower, RADIO_LABELS, RADIO_COLORS } from '@/src/types';

// ============================================================
// Модальное окно с информацией о вышке
// ============================================================

function TowerInfoModal({
  tower,
  onClose,
}: {
  tower: CellTower | null;
  onClose: () => void;
}) {
  if (!tower) return null;

  return (
    // transparent + slide — карточка выезжает снизу поверх карты
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      {/* Тёмная подложка, тап по ней закрывает модал */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* stopPropagation — чтобы тап по карточке не закрывал модал */}
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.networkBadge,
                { backgroundColor: RADIO_COLORS[tower.radio] },
              ]}
            >
              <Text style={styles.networkBadgeText}>
                {RADIO_LABELS[tower.radio]}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <InfoRow label="Cell ID" value={String(tower.cellid)} />
          <InfoRow label="MCC / MNC" value={`${tower.mcc} / ${tower.mnc}`} />
          <InfoRow label="LAC" value={String(tower.lac)} />
          <InfoRow
            label="Координаты"
            value={`${tower.lat.toFixed(5)}, ${tower.lon.toFixed(5)}`}
          />
          <InfoRow label="Радиус покрытия" value={`~${tower.range} м`} />
          <InfoRow label="Измерений в базе" value={String(tower.samples)} />
          {tower.averageSignalStrength !== 0 && (
            <InfoRow
              label="Средний сигнал"
              value={`${tower.averageSignalStrength} dBm`}
            />
          )}

          <Text style={styles.hint}>MCC = код страны · MNC = код оператора</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ============================================================
// Главный экран — default export обязателен для Expo Router
// ============================================================

export default function MapTab() {
  const { location, errorMsg, isLoading: locationLoading } = useLocation();
  const { towers, isLoading: towersLoading, error: towersError, refresh } =
    useTowers(location);

  const [selectedTower, setSelectedTower] = useState<CellTower | null>(null);

  // Ждём геолокацию
  if (locationLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Получаем геолокацию...</Text>
      </View>
    );
  }

  // Ошибка геолокации
  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location!.latitude,
          longitude: location!.longitude,
          latitudeDelta: 0.015,  // ~1.5 км по вертикали
          longitudeDelta: 0.015,
        }}
        showsUserLocation     // синяя точка пользователя
        showsMyLocationButton // кнопка "вернуться к себе"
      >
        {towers.map((tower) => (
          <Marker
            // Уникальный ключ из составного ID вышки
            key={`${tower.mcc}-${tower.mnc}-${tower.lac}-${tower.cellid}`}
            coordinate={{ latitude: tower.lat, longitude: tower.lon }}
            pinColor={RADIO_COLORS[tower.radio]}
            onPress={() => setSelectedTower(tower)}
            title={RADIO_LABELS[tower.radio]}
            description={`Cell ID: ${tower.cellid}`}
          />
        ))}
      </MapView>

      {/* Панель статуса — поверх карты (position: absolute) */}
      <SafeAreaView style={styles.statusBar} pointerEvents="box-none">
        <View style={styles.statusBadge}>
          {towersLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.statusText}>
              {towers.length > 0
                ? `${towers.length} вышек найдено`
                : (towersError ?? 'Загрузка...')}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshBtnText}>⟳</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Легенда */}
      <View style={styles.legend} pointerEvents="none">
        {(
          Object.entries(RADIO_LABELS) as [keyof typeof RADIO_LABELS, string][]
        ).map(([radio, label]) => (
          <View key={radio} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: RADIO_COLORS[radio] },
              ]}
            />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      <TowerInfoModal
        tower={selectedTower}
        onClose={() => setSelectedTower(null)}
      />
    </View>
  );
}

// ============================================================
// Стили
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center' },

  // Панель статуса сверху
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  refreshBtn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: { color: '#fff', fontSize: 20 },

  // Легенда
  legend: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#1e293b' },

  // Модал
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkBadge: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  networkBadgeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeBtn: { fontSize: 18, color: '#94a3b8', padding: 4 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  hint: { marginTop: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});
