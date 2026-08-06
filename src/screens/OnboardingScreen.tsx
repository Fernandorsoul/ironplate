import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { UserProfile, ActivityLevel, Goal, Sport } from '../types';
import { ACTIVITY_LEVELS } from '../constants/foods';

export default function OnboardingScreen() {
  const { setProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintenance');
  const [sport, setSport] = useState<Sport>('bodybuilding');

  const handleNext = () => {
    if (step === 0 && !name.trim()) {
      Alert.alert('Erro', 'Digite seu nome');
      return;
    }
    if (step === 1 && (!age || !weight || !height)) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    const profile: UserProfile = {
      name,
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      gender,
      activityLevel,
      goal,
      sport,
    };
    await setProfile(profile);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Como você se chama?</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Seus dados</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Idade"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Peso (kg)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Altura (cm)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>Feminino</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Nível de atividade</Text>
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map(level => (
              <TouchableOpacity
                key={level}
                style={[styles.optionButton, activityLevel === level && styles.optionButtonActive]}
                onPress={() => setActivityLevel(level)}
              >
                <Text style={[styles.optionText, activityLevel === level && styles.optionTextActive]}>
                  {ACTIVITY_LEVELS[level].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Seu objetivo</Text>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'bulking' && styles.optionButtonActive]}
              onPress={() => setGoal('bulking')}
            >
              <Text style={[styles.optionText, goal === 'bulking' && styles.optionTextActive]}>Bulking (ganhar massa)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'cutting' && styles.optionButtonActive]}
              onPress={() => setGoal('cutting')}
            >
              <Text style={[styles.optionText, goal === 'cutting' && styles.optionTextActive]}>Cutting (perder gordura)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'maintenance' && styles.optionButtonActive]}
              onPress={() => setGoal('maintenance')}
            >
              <Text style={[styles.optionText, goal === 'maintenance' && styles.optionTextActive]}>Manutenção</Text>
            </TouchableOpacity>

            <Text style={[styles.stepTitle, { marginTop: SPACING.lg }]}>Modalidade</Text>
            <TouchableOpacity
              style={[styles.optionButton, sport === 'bodybuilding' && styles.optionButtonActive]}
              onPress={() => setSport('bodybuilding')}
            >
              <Text style={[styles.optionText, sport === 'bodybuilding' && styles.optionTextActive]}>Bodybuilding</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, sport === 'bjj' && styles.optionButtonActive]}
              onPress={() => setSport('bjj')}
            >
              <Text style={[styles.optionText, sport === 'bjj' && styles.optionTextActive]}>BJJ / Artes Marciais</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, sport === 'both' && styles.optionButtonActive]}
              onPress={() => setSport('both')}
            >
              <Text style={[styles.optionText, sport === 'both' && styles.optionTextActive]}>Ambos</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.logo}>IRONPLATE</Text>
        <Text style={styles.subtitle}>Nutrição para Atletas</Text>

        {/* Progress */}
        <View style={styles.progressBar}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {renderStep()}
      </ScrollView>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>{step === 3 ? 'Começar' : 'Próximo'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + 40,
  },
  logo: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepContainer: {
    marginBottom: SPACING.lg,
  },
  stepTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  genderButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  genderText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
  },
  optionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    margin: SPACING.lg,
    alignItems: 'center',
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
});
