import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { Food } from '../types';

const AddFoodScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

  const { addCustomFood } = useApp();

  const saveFood = () => {
    if (!name || (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0)) {
      Alert.alert('Erro', 'Nome não pode estar vazio e pelo menos um macronutriente deve ser maior que zero.');
      return;
    }

    const newFood: Food = {
      id: `custom_${Date.now()}`,
      name,
      macros: { calories, protein, carbs, fat },
      category
    };

    addCustomFood(newFood)
      .then(() => navigation.goBack())
      .catch(error => Alert.alert('Erro', error.message));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, styles.centerHeader]}>Novo Alimento</Text>
        <TouchableOpacity onPress={saveFood}>
          <Text style={styles.headerText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do alimento"
          style={styles.input}
          placeholderTextColor={COLORS.textSecondary}
        />

        <View style={styles.categoryGrid}>
          {['Proteína', 'Carboidrato', 'Gordura', 'Fruta', 'Verdura', 'Laticínio', 'Outro'].map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.categoryButton, category === cat && styles.selected]}
            >
              <Text style={styles.categoryButtonText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          value={calories.toString()}
          onChangeText={(text) => setCalories(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Calorias (kcal)"
          style={styles.input}
          placeholderTextColor={COLORS.textSecondary}
        />

        <TextInput
          value={protein.toString()}
          onChangeText={(text) => setProtein(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Proteína (g)"
          style={styles.input}
          placeholderTextColor={COLORS.textSecondary}
        />

        <TextInput
          value={carbs.toString()}
          onChangeText={(text) => setCarbs(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Carboidratos (g)"
          style={styles.input}
          placeholderTextColor={COLORS.textSecondary}
        />

        <TextInput
          value={fat.toString()}
          onChangeText={(text) => setFat(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Gorduras (g)"
          style={styles.input}
          placeholderTextColor={COLORS.textSecondary}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, marginTop: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight
  },
  headerText: { fontSize: FONT_SIZE.md, color: COLORS.text },
  centerHeader: { textAlign: 'center' },
  content: { padding: SPACING.md },
  input: {
    height: 40, borderColor: COLORS.borderLight, borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm, color: COLORS.text
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  categoryButton: {
    width: '48%', paddingVertical: SPACING.md, alignItems: 'center',
    justifyContent: 'center', marginHorizontal: '1%', marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md
  },
  selected: { backgroundColor: COLORS.primary },
  categoryButtonText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary }
});

export default AddFoodScreen;
