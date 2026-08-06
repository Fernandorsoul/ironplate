import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Workout } from '../types';

const WorkoutDetailScreen = ({ route, navigation }: any) => {
  const { workout } = route.params;
  const { dailyLogs, addWorkoutToToday, removeWorkoutFromToday } = useApp();
  const [name, setName] = useState(workout.name);
  const [type, setType] = useState<Workout['type']>(workout.type);
  const [duration, setDuration] = useState<string>(workout.duration.toString());
  const [intensity, setIntensity] = useState<Workout['intensity']>(workout.intensity);

  const handleSave = () => {
    if (!name || parseInt(duration) <= 0) {
      Alert.alert('Erro', 'Nome do treino e duraÃ§Ã£o devem ser preenchidos.');
      return;
    }

    const updatedWorkout: Workout = { ...workout, name, type, duration: parseInt(duration), intensity };
    const newDailyLogs = dailyLogs.map(log => 
      log.date === workout.time ? { ...log, workouts: log.workouts.filter(w => w.id !== workout.id).concat(updatedWorkout) } : log
    );

    addWorkoutToToday(updatedWorkout);
    navigation.navigate('Home');
  };

  const renderTips = () => {
    switch (type) {
      case 'strength':
        return <Text style={styles.tip}>Treine com pesos adequados para evitar lesÃµes.</Text>;
      case 'cardio':
        return <Text style={styles.tip}>Manter uma boa forma Ã© crucial para o sucesso do treino cardio.</Text>;
      case 'bjj':
        return <Text style={styles.tip}>Pratique regularmente para melhorar suas habilidades.</Text>;
      case 'rest':
        return <Text style={styles.tip}>Descanso adequado Ã© fundamental para a recuperaÃ§Ã£o e melhoria do desempenho.</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>â† Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Editar Treino</Text>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do treino"
          style={styles.input}
        />
        <View style={styles.buttonGroup}>
          {['strength', 'cardio', 'bjj', 'rest'].map(t => (
            <TouchableOpacity key={t} onPress={() => setType(t as Workout['type'])} style={[styles.button, type === t && styles.activeButton]}>
              <Text style={[styles.buttonText, type === t && styles.activeButtonText]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="DuraÃ§Ã£o (min)"
          style={styles.input}
        />
        <View style={styles.buttonGroup}>
          {['low', 'medium', 'high'].map(i => (
            <TouchableOpacity key={i} onPress={() => setIntensity(i as Workout['intensity'])} style={[styles.button, intensity === i && styles.activeButton]}>
              <Text style={[styles.buttonText, intensity === i && styles.activeButtonText]}>{i.charAt(0).toUpperCase() + i.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderTips()}
      </ScrollView>
      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  backButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  header: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  input: {
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeButton: {
    backgroundColor: COLORS.primaryLight,
  },
  buttonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  activeButtonText: {
    color: COLORS.primaryDark,
  },
  tip: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.background,
  },
});

export default WorkoutDetailScreen;
