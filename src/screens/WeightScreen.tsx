import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { CartesianChart, Line, Scatter } from 'victory-native';

export default function WeightScreen({ navigation }: any) {
  const { weightHistory, addWeightEntry, setTodayWeight } = useApp();
  const [newWeight, setNewWeight] = useState('');

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

  const last7Days = weightHistory.slice(-7).reverse();
  const last30Days = weightHistory.slice(-30);

  const calculateTrend = () => {
    if (last7Days.length < 2) return null;
    const first = last7Days[last7Days.length - 1].weight;
    const last = last7Days[0].weight;
    return last - first;
  };

  const trend = calculateTrend();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Peso Corporal</Text>
        <View style={{ width: 50 }} />
      </View>

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
        {weightHistory.length > 0 && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Atual</Text>
              <Text style={styles.statValue}>{weightHistory[weightHistory.length - 1].weight} kg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tendência 7d</Text>
              <Text style={[styles.statValue, { color: trend && trend > 0 ? COLORS.warning : COLORS.success }]}>
                {trend ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg` : '---'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Mínimo</Text>
              <Text style={styles.statValue}>{Math.min(...last30Days.map(e => e.weight))} kg</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Máximo</Text>
              <Text style={styles.statValue}>{Math.max(...last30Days.map(e => e.weight))} kg</Text>
            </View>
          </View>
        )}

        {/* Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Evolução (30 dias)</Text>
          {last30Days.length >= 2 ? (
            <View style={{ height: 220 }}>
              <CartesianChart
                data={last30Days.map((e, i) => ({ day: i, weight: e.weight }))}
                xKey="day"
                yKeys={["weight"]}
                domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
              >
                {({ points }) => (
                  <>
                    <Line
                      points={points.weight}
                      color={COLORS.primary}
                      strokeWidth={2}
                      animate={{ type: "spring", duration: 300 }}
                    />
                    <Scatter
                      points={points.weight}
                      color={COLORS.primary}
                      radius={4}
                    />
                  </>
                )}
              </CartesianChart>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
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
