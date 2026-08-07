import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';

const BodyMeasurementsScreen = ({ navigation }: any) => {
  const { profile, setTodayWeight } = useApp();
  const [weight, setWeight] = useState(profile?.weight.toString() || '');
  const [bodyFat, setBodyFat] = useState('');
  const [armCircumference, setArmCircumference] = useState('');
  const [chestCircumference, setChestCircumference] = useState('');
  const [waistCircumference, setWaistCircumference] = useState('');
  const [hipCircumference, setHipCircumference] = useState('');
  const [thighCircumference, setThighCircumference] = useState('');

  const handleSave = async () => {
    try {
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight)) {
        Alert.alert('Erro', 'Peso inválido');
        return;
      }

      await setTodayWeight(parsedWeight);

      Alert.alert('Sucesso', 'Medidas salvas com sucesso');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao salvar medidas');
    }
  };

  const calculateValues = () => {
    if (!weight || isNaN(parseFloat(weight))) return {};

    const parsedWeight = parseFloat(weight);
    const bodyFatPercentage = bodyFat ? parseFloat(bodyFat) : 0;
    const height = (profile?.height || 170) / 100;

    const leanMass = Math.round(parsedWeight * (1 - bodyFatPercentage / 100));
    const fatMass = Math.round(parsedWeight * (bodyFatPercentage / 100));
    const bmi = Math.round((parsedWeight / (height ** 2)) * 10) / 10;

    return { leanMass, fatMass, bmi };
  };

  const { leanMass, fatMass, bmi } = calculateValues();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Medidas Corporais</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>% Gordura corporal</Text>
        <TextInput
          value={bodyFat}
          onChangeText={setBodyFat}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Circunferência braço (cm)</Text>
        <TextInput
          value={armCircumference}
          onChangeText={setArmCircumference}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Circunferência peito (cm)</Text>
        <TextInput
          value={chestCircumference}
          onChangeText={setChestCircumference}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Circunferência cintura (cm)</Text>
        <TextInput
          value={waistCircumference}
          onChangeText={setWaistCircumference}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Circunferência quadril (cm)</Text>
        <TextInput
          value={hipCircumference}
          onChangeText={setHipCircumference}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Circunferência coxa (cm)</Text>
        <TextInput
          value={thighCircumference}
          onChangeText={setThighCircumference}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Massa magra (kg)</Text>
        <Text style={styles.value}>{leanMass}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Massa gorda (kg)</Text>
        <Text style={styles.value}>{fatMass}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>IMC</Text>
        <Text style={styles.value}>{bmi}</Text>
      </View>
      <TouchableOpacity onPress={handleSave} style={styles.button}>
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
  header: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  input: {
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.background,
    fontWeight: 'bold',
  },
});

export default BodyMeasurementsScreen;