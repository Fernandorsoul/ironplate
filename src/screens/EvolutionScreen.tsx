import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { ScreenHeader } from '../components';
import { getBodyMeasurements, BodyMeasurement } from '../services/database';

type Period = '7d' | '30d' | '90d';

export default function EvolutionScreen({ navigation }: any) {
  const { userId } = useApp();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => { loadMeasurements(); }, [userId]);

  const loadMeasurements = async () => {
    if (!userId) return;
    try {
      const data = await getBodyMeasurements(userId, 90);
      console.log('[Evolution] Loaded measurements:', data.length);
      setMeasurements(data);
    } catch (error) {
      console.error('Error loading measurements:', error);
    }
  };

  const getFilteredData = () => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return measurements.filter(m => m.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
  };

  const filteredData = getFilteredData();
  const hasData = filteredData.length > 0;
  const hasMultiple = filteredData.length >= 2;

  const calcPercentChange = (current: number, start: number) => {
    if (!start || start === 0) return 0;
    return ((current - start) / start) * 100;
  };

  const getStats = () => {
    if (!hasData) return null;
    const current = filteredData[filteredData.length - 1];
    const first = filteredData[0];
    const weights = filteredData.map(d => d.weight);

    return {
      currentWeight: current.weight,
      startWeight: first.weight,
      weightChange: hasMultiple ? current.weight - first.weight : 0,
      weightPctChange: hasMultiple ? calcPercentChange(current.weight, first.weight) : 0,
      currentBodyFat: current.bodyFat,
      startBodyFat: first.bodyFat,
      bodyFatChange: hasMultiple && current.bodyFat && first.bodyFat ? current.bodyFat - first.bodyFat : undefined,
      minWeight: Math.min(...weights),
      maxWeight: Math.max(...weights),
      currentBMI: current.bmi,
      currentLeanMass: current.leanMass,
      currentFatMass: current.fatMass,
      measurementsCount: filteredData.length,
    };
  };

  const stats = getStats();

  const getCircumferenceEvolution = () => {
    if (!hasMultiple) return null;
    const first = filteredData[0];
    const last = filteredData[filteredData.length - 1];

    const items = [
      { label: 'Braço D', start: first.armRelaxedRight, current: last.armRelaxedRight },
      { label: 'Braço E', start: first.armRelaxedLeft, current: last.armRelaxedLeft },
      { label: 'Antebraço D', start: first.forearmRight, current: last.forearmRight },
      { label: 'Antebraço E', start: first.forearmLeft, current: last.forearmLeft },
      { label: 'Peito', start: first.chestCircumference, current: last.chestCircumference },
      { label: 'Cintura', start: first.waistCircumference, current: last.waistCircumference },
      { label: 'Abdômen', start: first.abdomenCircumference, current: last.abdomenCircumference },
      { label: 'Quadril', start: first.hipCircumference, current: last.hipCircumference },
      { label: 'Coxa D', start: first.thighMidRight, current: last.thighMidRight },
      { label: 'Coxa E', start: first.thighMidLeft, current: last.thighMidLeft },
      { label: 'Panturrilha D', start: first.calfRight, current: last.calfRight },
      { label: 'Panturrilha E', start: first.calfLeft, current: last.calfLeft },
    ].filter(i => i.start || i.current);

    return items.map(item => ({
      ...item,
      change: (item.current || 0) - (item.start || 0),
      pctChange: calcPercentChange(item.current || 0, item.start || 0),
    }));
  };

  const circumferenceEvolution = getCircumferenceEvolution();

  const formatChange = (value: number | undefined, suffix: string = '') => {
    if (value === undefined || value === 0) return '---';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${suffix}`;
  };

  const formatPct = (value: number | undefined) => {
    if (value === undefined || value === 0) return '---';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number | undefined, inverse: boolean = false) => {
    if (!value || value === 0) return COLORS.textSecondary;
    if (inverse) return value < 0 ? COLORS.success : COLORS.warning;
    return value > 0 ? COLORS.success : COLORS.warning;
  };

  // Chart data
  const getChartData = () => {
    if (!hasData) return null;
    const data = filteredData.slice(-10);
    const weights = data.map(e => e.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;

    return data.map((entry) => ({
      date: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
      weight: entry.weight,
      height: ((entry.weight - minW) / range) * 120 + 30,
      bodyFat: entry.bodyFat,
    }));
  };

  const chartData = getChartData();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Evolução" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Debug info */}
        <View style={styles.debugCard}>
          <Text style={styles.debugText}>Registros totais: {measurements.length}</Text>
          <Text style={styles.debugText}>Registros no período: {filteredData.length}</Text>
          <Text style={styles.debugText}>UserId: {userId || 'null'}</Text>
        </View>

        {!hasData ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
            <Text style={styles.emptySubtext}>Registre suas medidas na tela "Medidas" para acompanhar sua evolução</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('BodyMeasurements')}
            >
              <Text style={styles.emptyButtonText}>Registrar Medidas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Weight evolution */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Peso Corporal</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{hasMultiple ? 'Inicial' : 'Registro'}</Text>
                  <Text style={styles.statValue}>{stats?.startWeight.toFixed(1)} kg</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Atual</Text>
                  <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats?.currentWeight.toFixed(1)} kg</Text>
                </View>
                {hasMultiple && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Variação</Text>
                    <Text style={[styles.statValue, { color: getChangeColor(stats?.weightChange, true) }]}>
                      {formatChange(stats?.weightChange, ' kg')}
                    </Text>
                    <Text style={[styles.statPct, { color: getChangeColor(stats?.weightPctChange, true) }]}>
                      {formatPct(stats?.weightPctChange)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Body composition */}
            {stats?.currentBodyFat ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Composição Corporal</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Gordura</Text>
                    <Text style={styles.statValue}>{stats.currentBodyFat.toFixed(1)}%</Text>
                    {stats.bodyFatChange !== undefined && (
                      <Text style={[styles.statPct, { color: getChangeColor(stats.bodyFatChange, true) }]}>
                        {formatChange(stats.bodyFatChange, '%')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Massa Magra</Text>
                    <Text style={styles.statValue}>{stats.currentLeanMass?.toFixed(1)} kg</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>IMC</Text>
                    <Text style={styles.statValue}>{stats.currentBMI?.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Circumferences with percentages */}
            {circumferenceEvolution && circumferenceEvolution.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Evolução das Circunferências</Text>
                {circumferenceEvolution.map((circ, i) => (
                  <View key={i} style={styles.circRow}>
                    <Text style={styles.circLabel}>{circ.label}</Text>
                    <Text style={styles.circValue}>{circ.current?.toFixed(1) || '---'} cm</Text>
                    <View style={styles.circChangeContainer}>
                      <Text style={[styles.circChange, { color: getChangeColor(circ.change) }]}>
                        {formatChange(circ.change, ' cm')}
                      </Text>
                      <Text style={[styles.circPct, { color: getChangeColor(circ.pctChange) }]}>
                        {formatPct(circ.pctChange)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Weight chart */}
            {chartData ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Gráfico de Peso</Text>
                <View style={styles.chartContainer}>
                  <View style={styles.chartBars}>
                    {chartData.map((item, index) => (
                      <View key={index} style={styles.chartBarContainer}>
                        <Text style={styles.chartBarValue}>{item.weight.toFixed(0)}</Text>
                        <View style={[styles.chartBar, { height: item.height }]} />
                        <Text style={styles.chartBarLabel}>{item.date}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {/* Body fat chart */}
            {chartData && chartData.some(d => d.bodyFat) ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Gráfico de Gordura Corporal</Text>
                <View style={styles.chartContainer}>
                  <View style={styles.chartBars}>
                    {chartData.map((item, index) => {
                      if (!item.bodyFat) return null;
                      const bodyFats = chartData.filter(d => d.bodyFat).map(d => d.bodyFat!);
                      const minBF = Math.min(...bodyFats);
                      const maxBF = Math.max(...bodyFats);
                      const rangeBF = maxBF - minBF || 1;
                      const barHeight = ((item.bodyFat - minBF) / rangeBF) * 120 + 30;
                      
                      return (
                        <View key={index} style={styles.chartBarContainer}>
                          <Text style={styles.chartBarValue}>{item.bodyFat.toFixed(1)}</Text>
                          <View style={[styles.chartBar, { height: barHeight, backgroundColor: COLORS.warning }]} />
                          <Text style={styles.chartBarLabel}>{item.date}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : null}

            {/* History */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Histórico</Text>
              {[...filteredData].reverse().slice(0, 10).map((entry, index) => (
                <View key={index} style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                  {entry.bodyFat ? (
                    <Text style={styles.historyFat}>{entry.bodyFat.toFixed(1)}%</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  periodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  periodButton: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  periodButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  periodText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  periodTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  debugCard: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.md },
  debugText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: 'bold', marginBottom: SPACING.sm },
  emptySubtext: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center', marginBottom: SPACING.lg },
  emptyButton: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  emptyButtonText: { color: COLORS.text, fontWeight: 'bold' },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
  cardTitle: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  statValue: { fontSize: FONT_SIZE.lg, fontWeight: 'bold', color: COLORS.text },
  statPct: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: 2 },
  circRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  circLabel: { flex: 2, color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  circValue: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600', textAlign: 'center' },
  circChangeContainer: { flex: 1, alignItems: 'flex-end' },
  circChange: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  circPct: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  chartContainer: { height: 200, justifyContent: 'flex-end' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 180 },
  chartBarContainer: { alignItems: 'center', flex: 1 },
  chartBar: { width: 20, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.sm, marginHorizontal: 2 },
  chartBarValue: { fontSize: 9, color: COLORS.textSecondary, marginBottom: 2 },
  chartBarLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyDate: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, flex: 1 },
  historyWeight: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600', flex: 1, textAlign: 'center' },
  historyFat: { color: COLORS.primary, fontSize: FONT_SIZE.sm, flex: 1, textAlign: 'right' },
});
