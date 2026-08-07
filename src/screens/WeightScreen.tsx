import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useWeightTrend } from '../hooks';
import { ScreenHeader } from '../components';

export default function WeightScreen({ navigation }: any) {
  const { weightHistory, addWeightEntry, setTodayWeight } = useApp();
  const [newWeight, setNewWeight] = useState('');
  const { last7Days, last30Days, trend, stats } = useWeightTrend(weightHistory);

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      Alert.alert('Erro', 'Digite um peso válido (30-300 kg)');
      return;
    }

    await setTodayWeight(weight);
    setNewWeight('');
    Alert.alert('Sucesso', 'Peso registrado!');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Peso Corporal" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Add Weight */}
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Registrar Peso</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.weightInput}
              keyboardType="numeric"
              placeholder="0.0"
              placeholderTextColor={COLORS.textMuted}
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <Text style={styles.unitLabel}>kg</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddWeight}>
              <Text style={styles.addButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Stats */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Atual</Text>
              <Text style={styles.statValue}>{stats.current} kg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tendência 7d</Text>
              <Text style={[styles.statValue, { color: trend && trend > 0 ? COLORS.warning : COLORS.success }]}>
                {trend ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg` : '---'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Mínimo</Text>
              <Text style={styles.statValue}>{stats.min} kg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Máximo</Text>
              <Text style={styles.statValue}>{stats.max} kg</Text>
            </View>
          </View>
        )}

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolução (30 dias)</Text>
          {last30Days.length >= 2 ? (
            <View style={styles.chartContainer}>
              {/* Simple bar chart for web compatibility */}
              <View style={styles.chartBars}>
                {last30Days.slice(-10).map((entry, index) => {
                  const weights = last30Days.map(e => e.weight);
                  const minWeight = Math.min(...weights);
                  const maxWeight = Math.max(...weights);
                  const range = maxWeight - minWeight || 1;
                  const height = ((entry.weight - minWeight) / range) * 150 + 20;
                  
                  return (
                    <View key={index} style={styles.chartBarContainer}>
                      <Text style={styles.chartBarValue}>{entry.weight}</Text>
                      <View style={[styles.chartBar, { height }]} />
                      <Text style={styles.chartBarLabel}>
                        {new Date(entry.date).getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.chartEmpty}>Registre pelo menos 2 pesos para ver o gráfico</Text>
            </View>
          )}
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Histórico</Text>
        {weightHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum registro de peso</Text>
          </View>
        ) : (
          [...weightHistory].reverse().slice(0, 10).map((entry, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDate}>{new Date(entry.date).toLocaleDateString('pt-BR')}</Text>
              <Text style={styles.historyWeight}>{entry.weight} kg</Text>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  addCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  addTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  weightInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    textAlign: 'center',
  },
  unitLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  addButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    height: 220,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 200,
    paddingHorizontal: SPACING.sm,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 20,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    marginHorizontal: 2,
  },
  chartBarValue: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
  },
  chartEmpty: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  historyWeight: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
