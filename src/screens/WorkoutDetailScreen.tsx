import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Workout } from '../types';

const WorkoutDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { updateWorkoutInToday } = useApp();
  const [name, setName] = useState(route.params.workout.name);
  const [type, setType] = useState<Workout['type']>(route.params.workout.type);
  const [duration, setDuration] = useState<string>(route.params.workout.duration.toString());
  const [intensity, setIntensity] = useState<Workout['intensity']>(route.params.workout.intensity);

  const handleSave = () => {
    if (!name || parseInt(duration) <= 0) {
      Alert.alert('Erro', 'Nome do treino e duração devem ser preenchidos.');
      return;
    }

    const updatedWorkout: Workout = {
      id: route.params.workout.id,
      name,
      type,
      duration: parseInt(duration),
      intensity,
    };

    updateWorkoutInToday(route.params.workout.id, updatedWorkout);
    navigation.goBack();
  };

  const renderTypeButton = (label: string, value: Workout['type']) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        type === value && styles.selectedTypeButton,
      ]}
      onPress={() => setType(value)}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderIntensityButton = (label: string, value: Workout['intensity']) => (
    <TouchableOpacity
      style={[
        styles.intensityButton,
        intensity === value && styles.selectedIntensityButton,
      ]}
      onPress={() => setIntensity(value)}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderTips = () => {
    switch (type) {
      case 'strength':
        return (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>Treine com peso adequado para evitar lesões.</Text>
          </View>
        );
      case 'cardio':
        return (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>Manter uma boa forma é crucial para o cardio.</Text>
          </View>
        );
      case 'bjj':
        return (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>Pratique regularmente para melhorar suas técnicas.</Text>
          </View>
        );
      case 'rest':
        return (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>Descanse adequadamente para recuperação.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.headerText}>Editar Treino</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nome do treino"
        style={styles.input}
      />

      {renderTypeButton('Musculação', 'strength')}
      {renderTypeButton('Cardio', 'cardio')}
      {renderTypeButton('BJJ', 'bjj')}
      {renderTypeButton('Descanso', 'rest')}

      <TextInput
        value={duration}
        onChangeText={setDuration}
        keyboardType="numeric"
        placeholder="Duração (min)"
        style={styles.input}
      />

      {renderIntensityButton('Leve', 'low')}
      {renderIntensityButton('Moderado', 'medium')}
      {renderIntensityButton('Intenso', 'high')}

      {renderTips()}

      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.buttonText}>Salvar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  headerText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xl,
  },
  input: {
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  selectedTypeButton: {
    backgroundColor: COLORS.primary,
  },
  intensityButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  selectedIntensityButton: {
    backgroundColor: COLORS.accent,
  },
  tipsCard: {
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  tipsText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.background,
  },
});

export default WorkoutDetailScreen;