import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Workout } from '../types';

export default function AddWorkoutScreen({ navigation, route }: any) {
  const { addWorkoutToToday } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<Workout['type']>('strength');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<Workout['intensity']>('medium');
  const [saving, setSaving] = useState(false);

  const workoutTypes = [
    { key: 'strength', label: 'Musculação', icon: '🏋️' },
    { key: 'bjj', label: 'BJJ', icon: '🥋' },
    { key: 'cardio', label: 'Cardio', icon: '🏃' },
    { key: 'rest', label: 'Descanso', icon: '😴' },
  ];

  const intensities = [
    { key: 'low', label: 'Leve' },
    { key: 'medium', label: 'Moderado' },
    { key: 'high', label: 'Intenso' },
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do treino');
      return;
    }
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert('Erro', 'Digite a duração válida');
      return;
    }

    const workout: Workout = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      duration: parseInt(duration),
      intensity,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setSaving(true);
    try {
      await addWorkoutToToday(workout);
      setName('');
      setDuration('');
      setType('strength');
      setIntensity('medium');
      Alert.alert('Treino salvo', 'O treino foi registrado no resumo de hoje.');
      if (route?.name === 'Workout') {
        navigation.navigate('Home');
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o treino. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Novo Treino</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>{saving ? 'Salvando...' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Workout Name */}
        <TextInput
          style={styles.input}
          placeholder="Nome do treino (ex: Peito e Tríceps)"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Workout Type */}
        <Text style={styles.sectionTitle}>Tipo</Text>
        <View style={styles.typeGrid}>
          {workoutTypes.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeButton, type === t.key && styles.typeButtonActive]}
              onPress={() => setType(t.key as Workout['type'])}
            >
              <Text style={styles.typeIcon}>{t.icon}</Text>
              <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.sectionTitle}>Duração (minutos)</Text>
        <TextInput
          style={styles.input}
          placeholder="60"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
        />

        {/* Intensity */}
        <Text style={styles.sectionTitle}>Intensidade</Text>
        <View style={styles.intensityGrid}>
          {intensities.map(i => (
            <TouchableOpacity
              key={i.key}
              style={[styles.intensityButton, intensity === i.key && styles.intensityButtonActive]}
              onPress={() => setIntensity(i.key as Workout['intensity'])}
            >
              <Text style={[styles.intensityLabel, intensity === i.key && styles.intensityLabelActive]}>
                {i.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Dicas para {type === 'bjj' ? 'BJJ' : 'Musculação'}</Text>
          {type === 'bjj' ? (
            <>
              <Text style={styles.tipText}>• Hidrate-se bem antes do treino</Text>
              <Text style={styles.tipText}>• Refeição leve 2h antes</Text>
              <Text style={styles.tipText}>• Proteína + carboidrato pós-treino</Text>
            </>
          ) : (
            <>
              <Text style={styles.tipText}>• Carboidratos 1-2h antes do treino</Text>
              <Text style={styles.tipText}>• Proteína dentro de 30min pós-treino</Text>
              <Text style={styles.tipText}>• 2-3g de leucina por refeição</Text>
            </>
          )}
        </View>

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
  saveButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  saveButtonDisabled: { opacity: 0.5 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeButton: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  typeLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  typeLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  intensityGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  intensityButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intensityButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  intensityLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  intensityLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tipsCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  tipsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
});
