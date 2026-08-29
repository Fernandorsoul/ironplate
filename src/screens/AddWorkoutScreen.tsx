import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MuscleGroupSelector, TrainingSplitSelector } from '../components';
import { getWorkoutTypeOption, WORKOUT_TYPE_OPTIONS } from '../constants/sports';
import { getTrainingSplit } from '../constants/trainingSplits';
import type { TrainingDayTemplate } from '../constants/trainingSplits';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SPACING } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { MuscleGroup, TrainingSplitId, Workout } from '../types';
import { SCREEN_CONTENT_MAX_WIDTH, SMALL_PHONE_BREAKPOINT } from '../constants/layout';

const INTENSITIES: Array<{ id: Workout['intensity']; label: string }> = [
  { id: 'low', label: 'Leve' },
  { id: 'medium', label: 'Moderado' },
  { id: 'high', label: 'Intenso' },
];

export default function AddWorkoutScreen({ navigation, route }: any) {
  const { addWorkoutToToday } = useApp();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < SMALL_PHONE_BREAKPOINT;
  const [name, setName] = useState('Full body');
  const [type, setType] = useState<Workout['type']>('strength');
  const [duration, setDuration] = useState('60');
  const [intensity, setIntensity] = useState<Workout['intensity']>('medium');
  const [splitId, setSplitId] = useState<TrainingSplitId>('full_body');
  const [splitDayId, setSplitDayId] = useState('full_body');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(['full_body']);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (nextType: Workout['type']) => {
    setType(nextType);
    if (nextType === 'strength') {
      const split = getTrainingSplit(splitId);
      const day = split.days.find(item => item.id === splitDayId) || split.days[0];
      setName(day.label);
      setMuscleGroups(day.muscleGroups);
      return;
    }

    setName(getWorkoutTypeOption(nextType).label);
    setMuscleGroups([]);
  };

  const handleSplitChange = (nextSplitId: TrainingSplitId) => {
    const split = getTrainingSplit(nextSplitId);
    const firstDay = split.days[0];
    setSplitId(nextSplitId);
    setSplitDayId(firstDay.id);
    setMuscleGroups(firstDay.muscleGroups);
    setName(firstDay.label);
  };

  const handleDayChange = (day: TrainingDayTemplate) => {
    setSplitDayId(day.id);
    setMuscleGroups(day.muscleGroups);
    setName(day.label);
  };

  const handleSave = async () => {
    const parsedDuration = Number.parseInt(duration, 10);
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do treino');
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('Erro', 'Digite uma duração válida');
      return;
    }
    if (type === 'strength' && muscleGroups.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um grupo muscular');
      return;
    }

    const workout: Workout = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      duration: parsedDuration,
      intensity,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ...(type === 'strength' ? { splitId, splitDayId, muscleGroups } : {}),
    };

    setSaving(true);
    try {
      await addWorkoutToToday(workout);
      setName('Full body');
      setDuration('60');
      setType('strength');
      setIntensity('medium');
      setSplitId('full_body');
      setSplitDayId('full_body');
      setMuscleGroups(['full_body']);
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

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'Home' });
  };

  const selectedWorkoutType = getWorkoutTypeOption(type);

  return (
    <View style={styles.container}>
      <View style={[styles.header, styles.contentWidth, isSmallScreen && styles.compactHorizontalPadding]}>
        <TouchableOpacity accessibilityRole="button" onPress={handleBack}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text numberOfLines={1} style={[styles.title, isSmallScreen && styles.titleCompact]}>Novo treino</Text>
        <TouchableOpacity accessibilityRole="button" onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, styles.contentWidth, isSmallScreen && styles.compactHorizontalPadding]}
      >
        <Text style={styles.sectionTitle}>Modalidade da sessão</Text>
        <View style={styles.typeGrid}>
          {WORKOUT_TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: type === option.id }}
              key={option.id}
              style={[
                styles.typeButton,
                isSmallScreen && styles.typeButtonCompact,
                type === option.id && styles.typeButtonActive,
              ]}
              onPress={() => handleTypeChange(option.id)}
            >
              <Text style={styles.typeIcon}>{option.icon}</Text>
              <Text style={[styles.typeLabel, type === option.id && styles.typeLabelActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {type === 'strength' ? (
          <>
            <TrainingSplitSelector
              selectedSplitId={splitId}
              selectedDayId={splitDayId}
              onSelectSplit={handleSplitChange}
              onSelectDay={handleDayChange}
            />
            <Text style={styles.sectionTitle}>Grupos musculares</Text>
            <Text style={styles.helperText}>
              O template sugere os grupos. Toque para ajustar antes de salvar.
            </Text>
            <MuscleGroupSelector
              selectedGroups={muscleGroups}
              onChange={setMuscleGroups}
            />
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Nome do treino</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Peito e bíceps"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={160}
        />

        <Text style={styles.sectionTitle}>Duração em minutos</Text>
        <TextInput
          style={styles.input}
          placeholder="60"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={duration}
          onChangeText={setDuration}
          maxLength={4}
        />

        <Text style={styles.sectionTitle}>Intensidade percebida</Text>
        <View style={styles.intensityGrid}>
          {INTENSITIES.map(option => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: intensity === option.id }}
              key={option.id}
              style={[styles.intensityButton, intensity === option.id && styles.intensityButtonActive]}
              onPress={() => setIntensity(option.id)}
            >
              <Text style={[styles.intensityLabel, intensity === option.id && styles.intensityLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{selectedWorkoutType.icon} {selectedWorkoutType.label}</Text>
          <Text style={styles.tipText}>{selectedWorkoutType.description}</Text>
          {type === 'strength' ? (
            <Text style={styles.tipText}>
              A divisão organiza a semana; o resultado depende do volume, esforço, progressão e recuperação, não apenas do nome ABC ou ABCDE.
            </Text>
          ) : null}
          <Text style={styles.tipCaution}>
            Ajuste intensidade e duração ao seu nível. Dor, lesão ou condição clínica exigem avaliação profissional.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.background, flex: 1 },
  contentWidth: { alignSelf: 'center', maxWidth: SCREEN_CONTENT_MAX_WIDTH, width: '100%' },
  compactHorizontalPadding: { paddingHorizontal: SPACING.sm },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  backButton: { color: COLORS.primary, fontSize: FONT_SIZE.sm },
  title: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: 'bold' },
  titleCompact: { fontSize: FONT_SIZE.md },
  saveButton: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: 'bold' },
  saveButtonDisabled: { opacity: 0.5 },
  scrollContent: { paddingBottom: 120, paddingHorizontal: SPACING.md },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexBasis: 132,
    flexGrow: 1,
    minWidth: 120,
    padding: SPACING.md,
  },
  typeButtonCompact: { flexBasis: 125, minWidth: 118, paddingHorizontal: SPACING.sm },
  typeButtonActive: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.primary },
  typeIcon: { fontSize: 26, marginBottom: SPACING.xs },
  typeLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  typeLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    padding: SPACING.md,
  },
  intensityGrid: { flexDirection: 'row', gap: SPACING.sm },
  intensityButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  intensityButtonActive: { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.primary },
  intensityLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  intensityLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  tipsCard: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.lg, padding: SPACING.lg },
  tipsTitle: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: 'bold', marginBottom: SPACING.sm },
  tipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  tipCaution: { color: COLORS.warning, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
});
