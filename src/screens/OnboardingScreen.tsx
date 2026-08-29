import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { UserProfile, ActivityLevel, Goal, Sport } from '../types';
import { ACTIVITY_LEVELS } from '../constants/foods';
import { SPORT_OPTIONS } from '../constants/sports';

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
            
            <Text style={styles.subsectionTitle}>Ganho de Massa</Text>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'bulking' && styles.optionButtonActive]}
              onPress={() => setGoal('bulking')}
            >
              <Text style={[styles.optionText, goal === 'bulking' && styles.optionTextActive]}>Bulking (+15% calorias)</Text>
            </TouchableOpacity>

            <Text style={styles.subsectionTitle}>Perda de Gordura</Text>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'cutting_conservative' && styles.optionButtonActive]}
              onPress={() => setGoal('cutting_conservative')}
            >
              <Text style={[styles.optionText, goal === 'cutting_conservative' && styles.optionTextActive]}>Cutting Conservador (-15%)</Text>
              <Text style={styles.optionDesc}>Off-season / iniciantes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'cutting_preparation' && styles.optionButtonActive]}
              onPress={() => setGoal('cutting_preparation')}
            >
              <Text style={[styles.optionText, goal === 'cutting_preparation' && styles.optionTextActive]}>Preparação (-20%)</Text>
              <Text style={styles.optionDesc}>12-8 semanas antes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'cutting_precontest' && styles.optionButtonActive]}
              onPress={() => setGoal('cutting_precontest')}
            >
              <Text style={[styles.optionText, goal === 'cutting_precontest' && styles.optionTextActive]}>Pré-Competição (-25%)</Text>
              <Text style={styles.optionDesc}>8-4 semanas antes</Text>
            </TouchableOpacity>

            <Text style={styles.subsectionTitle}>Manutenção</Text>
            <TouchableOpacity
              style={[styles.optionButton, goal === 'maintenance' && styles.optionButtonActive]}
              onPress={() => setGoal('maintenance')}
            >
              <Text style={[styles.optionText, goal === 'maintenance' && styles.optionTextActive]}>Manutenção do Peso</Text>
            </TouchableOpacity>

            <Text style={[styles.stepTitle, { marginTop: SPACING.lg }]}>Modalidade</Text>
            <View style={styles.sportGrid}>
              {SPORT_OPTIONS.map(option => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: sport === option.id }}
                  key={option.id}
                  style={[styles.sportButton, sport === option.id && styles.optionButtonActive]}
                  onPress={() => setSport(option.id)}
                >
                  <Text style={styles.sportIcon}>{option.icon}</Text>
                  <Text style={[styles.sportText, sport === option.id && styles.optionTextActive]}>{option.shortLabel}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
    paddingBottom: 120,
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
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sportButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexBasis: 126,
    flexGrow: 1,
    minHeight: 78,
    minWidth: 118,
    padding: SPACING.sm,
  },
  sportIcon: { fontSize: 22, marginBottom: SPACING.xs },
  sportText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, textAlign: 'center' },
  optionDesc: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  subsectionTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
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
