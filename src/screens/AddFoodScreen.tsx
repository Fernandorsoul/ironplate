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

  const handleSave = () => {
    if (!name || (calories === 0 && protein === 0 && carbs === 0 && fat === 0)) {
      Alert.alert('Erro', 'Nome do alimento e pelo menos uma macro devem ser preenchidos.');
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
          <Text style={styles.headerText}>â† Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, styles.centerHeader]}>Novo Alimento</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.headerText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do alimento"
          style={styles.input}
        />

        <View style={styles.categoryGrid}>
          <TouchableOpacity onPress={() => setCategory('Proteína')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Proteína</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Carboidrato')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Carboidrato</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Gordura')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Gordura</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Fruta')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Fruta</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Verdura')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Verdura</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Laticínio')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Laticínio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCategory('Outro')} style={styles.categoryButton}>
            <Text style={styles.categoryButtonText}>Outro</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={calories.toString()}
          onChangeText={(text) => setCalories(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Calorias (kcal)"
          style={styles.input}
        />

        <TextInput
          value={protein.toString()}
          onChangeText={(text) => setProtein(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Proteína (g)"
          style={styles.input}
        />

        <TextInput
          value={carbs.toString()}
          onChangeText={(text) => setCarbs(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Carboidratos (g)"
          style={styles.input}
        />

        <TextInput
          value={fat.toString()}
          onChangeText={(text) => setFat(Math.round(Number(text)) || 0)}
          keyboardType="numeric"
          placeholder="Gordura (g)"
          style={styles.input}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.primaryDark,
    marginTop: SPACING.xl
  },
  headerText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg
  },
  centerHeader: {
    textAlign: 'center'
  },
  content: {
    padding: SPACING.md
  },
  input: {
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  categoryButton: {
    width: '30%',
    margin: SPACING.xs,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight
  },
  categoryButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm
  }
});

export default AddFoodScreen;
