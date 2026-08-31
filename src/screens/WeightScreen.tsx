import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useWeightTrend } from '../hooks';
import { ScreenHeader } from '../components';
import { connectToWeightScale, type ScaleReadout, readoutToMetrics } from '../services/bluetoothScale';
import { saveBodyMeasurement } from '../services/database';

// Metric definition cards with icon + label
interface MetricCardDef {
  key: keyof ScaleReadout;
  label: string;
  unit: string;
  format?: (v: number) => string;
}

const METRIC_CARDS: MetricCardDef[] = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'resistance', label: 'Resistência', unit: 'Ω' },
  { key: 'reactance', label: 'Reactância', unit: 'Ω' },
  { key: 'phaseAngle', label: 'Ângulo Fase', unit: '°' },
  { key: 'bodyFat', label: '% Gordura', unit: '%' },
  { key: 'visceralFat', label: 'Gordura Visceral', unit: 'grau' },
  { key: 'muscleMass', label: 'Massa Muscular', unit: 'kg' },
  { key: 'skeletalMuscle', label: 'M. Esquelético', unit: 'kg' },
  { key: 'waterPercent', label: '% Água', unit: '%' },
  { key: 'waterKg', label: 'Água', unit: 'kg' },
  { key: 'boneMass', label: 'Massa Óssea', unit: 'kg' },
  { key: 'proteinPercent', label: '% Proteína', unit: '%' },
  { key: 'proteinMass', label: 'Proteína', unit: 'kg' },
  { key: 'bmi', label: 'IMC', unit: '' },
  { key: 'basalMetabolism', label: 'Metabolismo Basal', unit: 'kcal/dia' },
];

function getLocalDateString(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function WeightScreen({ navigation }: any) {
  const { userId, profile, weightHistory, addWeightEntry } = useApp();
  const stopRef = useRef<(() => void) | null>(null);
  const [scaleStatus, setScaleStatus] = useState('Nenhuma balança conectada');
  const [isScanning, setIsScanning] = useState(false);
  const [readout, setReadout] = useState<ScaleReadout | null>(null);
  const [manualWeight, setManualWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Trend data
  const { last30Days, trend } = useWeightTrend(weightHistory);

  // Cleanup on unmount
  useEffect(() => () => stopRef.current?.(), []);

  // ─── Scanning ────────────────────────────────────────────────
  const handleConnectScale = async () => {
    stopRef.current?.();
    setIsScanning(true);
    setReadout(null);
    try {
      stopRef.current = await connectToWeightScale({
        onWeight: (rd, name) => {
          setReadout(rd);
          setScaleStatus(`${name}: ${Object.keys(rd).length} métrica(s) recebida(s)`);
          setIsScanning(false);
        },
        onStatus: (msg) => {
          setScaleStatus(msg);
          if (!isScanning && msg.includes('Procurando') || msg.includes('Inicializando')) {
            setIsScanning(true);
          }
        },
      });
    } catch (error) {
      setScaleStatus(error instanceof Error ? error.message : 'Erro ao conectar à balança.');
      setIsScanning(false);
    }
  };

  // ─── Save manual weight ──────────────────────────────────────
  const handleSaveManual = async () => {
    const w = parseFloat(manualWeight.replace(',', '.'));
    if (isNaN(w) || w < 30 || w > 300) {
      Alert.alert('Erro', 'Digite um peso válido (30–300 kg)');
      return;
    }
    setSaving(true);
    try {
      await saveToApp(w, undefined);
      setManualWeight('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro', `NÃ£o foi possÃ­vel salvar o peso: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Save scale readout ──────────────────────────────────────
  const handleSaveScale = async () => {
    if (!readout?.weight) {
      Alert.alert('Sem dados', 'A balança não retornou peso.');
      return;
    }
    setSaving(true);
    try {
      // Use saveBodyMeasurement to store full composition data
      if (userId) {
        await saveBodyMeasurement(userId, {
          date: getLocalDateString(),
          weight: readout.weight,
          bodyFat: readout.bodyFat,
          resistance: readout.resistance,
          reactance: readout.reactance,
          phaseAngle: readout.phaseAngle,
          muscleMass: readout.muscleMass,
          skeletalMuscle: readout.skeletalMuscle,
          waterPercent: readout.waterPercent,
          boneMass: readout.boneMass,
          bmi: readout.bmi,
          basalMetabolism: readout.basalMetabolism,
          visceralFat: readout.visceralFat,
          notes: `Fonte: Balança Bluetooth${readout.imperial ? ' (imperial)' : ''}`,
        });
      }
      await saveToApp(readout.weight, readout.bodyFat);
      setReadout(null);
      setScaleStatus('Métricas salvas com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro', `Não foi possível salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  /** Internal helper: persist the weight and update the local state. */
  const saveToApp = async (weight: number, bodyFat?: number) => {
    await addWeightEntry({ date: getLocalDateString(), weight, bodyFat });
    Alert.alert('Sucesso', `${weight.toFixed(1)} kg registrado${bodyFat != null ? `, ${bodyFat}% BF` : ''}`);
  };

  // ─── Pull-to-refresh ─────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await handleConnectScale();
    setRefreshing(false);
  };

  // ─── Render metric card ──────────────────────────────────────
  const renderMetric = (mc: MetricCardDef) => {
    const val = readout?.[mc.key];
    if (val == null || typeof val === 'boolean') return null;
    const display = mc.format ? mc.format(val as number) : `${val}${mc.unit ? ' ' + mc.unit : ''}`;
    return (
      <View key={mc.key} style={styles.metricCard}>
        <Text style={styles.metricLabel}>{mc.label}</Text>
        <Text style={styles.metricValue}>{display}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Peso Corporal & Composição" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Bluetooth Scan Card ─────────────────────────────── */}
        <View style={styles.scanCard}>
          <Text style={styles.cardTitle}>📡 Scanner Bluetooth</Text>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={handleConnectScale}
            disabled={isScanning}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Procurando balanças…' : 'Conectar balança'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.scaleStatus}>{scaleStatus}</Text>
        </View>

        {/* ── Manual Input Card ───────────────────────────────── */}
        <View style={styles.manualCard}>
          <Text style={styles.cardTitle}>✏️ Registrar Peso Manual</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.weightInput}
              keyboardType="numeric"
              placeholder="75,5"
              placeholderTextColor={COLORS.textMuted}
              value={manualWeight}
              onChangeText={setManualWeight}
            />
            <Text style={styles.unitLabel}>kg</Text>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.readoutSaveDisabled]}
              onPress={handleSaveManual}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Salvandoâ€¦' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scale Readout Cards ─────────────────────────────── */}
        {readout && Object.keys(readout).length > 0 && (
          <>
            <View style={styles.readoutHeader}>
              <Text style={styles.cardTitle}>📊 Métricas Recebidas</Text>
              <TouchableOpacity
                style={[styles.readoutSaveButton, saving && styles.readoutSaveDisabled]}
                onPress={handleSaveScale}
                disabled={saving}
              >
                <Text style={styles.readoutSaveButtonText}>
                  {saving ? 'Salvando…' : 'Salvar Todas'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsGrid}>
              {METRIC_CARDS.map(renderMetric)}
              {/* Custom rows not in predefined list */}
              {readout.waterKg != null && !METRIC_CARDS.some(m => m.key === 'waterKg')
                ? renderMetric({ key: 'waterKg', label: 'Água', unit: 'kg' })
                : null}
            </View>
          </>
        )}

        {/* ── Trend Stats ─────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Atual</Text>
            <Text style={styles.statNum}>
              {weightHistory.length > 0
                ? `${weightHistory[weightHistory.length - 1]?.weight} kg`
                : '—'}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Tendência 7d</Text>
            <Text style={[
              styles.statNum,
              { color: trend && trend > 0 ? COLORS.warning : COLORS.success },
            ]}>
              {trend != null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg` : '—'}
            </Text>
          </View>
        </View>

        {/* ── Chart ───────────────────────────────────────────── */}
        {last30Days.length >= 2 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Evolução</Text>
            <View style={styles.chartBars}>
              {last30Days.slice(-14).map((entry, index) => {
                const weights = last30Days.map(e => e.weight);
                const minW = Math.min(...weights);
                const maxW = Math.max(...weights);
                const range = maxW - minW || 1;
                const h = ((entry.weight - minW) / range) * 160 + 24;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <Text style={styles.barVal}>{entry.weight}</Text>
                    <View style={[styles.bar, { height: h }]} />
                    <Text style={styles.barDate}>
                      {new Date(entry.date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── History ─────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Histórico</Text>
        {weightHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum registro ainda</Text>
          </View>
        ) : (
          [...weightHistory].reverse().slice(0, 10).map((entry, idx) => (
            <View key={idx} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {new Date(entry.date).toLocaleDateString('pt-BR')}
              </Text>
              <Text style={styles.historyWeight}>
                {entry.weight} kg{entry.bodyFat != null ? ` · ${entry.bodyFat}% BF` : ''}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── Styles ────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },

  scanCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  scanButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginBottom: SPACING.sm,
  },
  scanButtonDisabled: { opacity: 0.5 },
  scanButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: FONT_SIZE.md },
  scaleStatus: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, textAlign: 'center' },

  manualCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  weightInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, fontSize: FONT_SIZE.xl, color: COLORS.text, textAlign: 'center',
  },
  unitLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.lg },
  saveButton: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  saveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: FONT_SIZE.md },

  readoutHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md, paddingHorizontal: SPACING.xs,
  },
  readoutSaveButton: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  readoutSaveDisabled: { opacity: 0.5 },
  readoutSaveButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: FONT_SIZE.sm },

  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricCard: {
    width: '48%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  metricLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.primary },

  statsRow: {
    flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md,
  },
  statChip: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  statNum: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text },

  chartCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  chartBars: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    height: 200, paddingHorizontal: SPACING.xs,
  },
  barWrapper: { alignItems: 'center', flex: 1 },
  bar: { width: 18, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm },
  barVal: { fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 },
  barDate: { fontSize: 9, color: COLORS.textMuted, marginTop: 4 },

  cardTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },

  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  emptyState: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  historyDate: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  historyWeight: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
});
