import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { FOOD_DATABASE, MEAL_TIMING_LABELS } from '../constants/foods';
import { useApp } from '../context/AppContext';
import { calculatePortionMacros, sumMacros } from '../utils/calculations';
import { Food, FoodPortion, Meal, MealTiming } from '../types';

const EditMealScreen = ({ route, navigation }: any) => {
  const { meal: initialMeal } = route.params;
  const [name, setName] = useState(initialMeal.name);
  const [timing, setTiming] = useState<MealTiming>(initialMeal.timing);
  const [selectedFoods, setSelectedFoods] = useState<FoodPortion[]>(initialMeal.foods);

  const handleSave = () => {
    if (!name) {
      Alert.alert('Erro', 'Nome da refeiÃ§Ã£o Ã© obrigatÃ³rio');
      return;
    }
    if (selectedFoods.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um alimento');
      return;
    }

    const newMeal: Meal = {
      id: initialMeal.id,
      name,
      timing,
      foods: selectedFoods,
      totalMacros: sumMacros(selectedFoods.map(item => calculatePortionMacros(item.food, item.grams))),
    };

    useApp().removeMealFromToday(initialMeal.id);
    useApp().addMealToToday(newMeal);
    navigation.goBack();
  };

  const handleAddFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, { food, grams: 100, macros: calculatePortionMacros(food, 100) }]);
  };

  const handleRemoveFood = (index: number) => {
    const newSelectedFoods = [...selectedFoods];
    newSelectedFoods.splice(index, 1);
    setSelectedFoods(newSelectedFoods);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerText}>â† Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, styles.centerHeader]}>Editar RefeiÃ§Ã£o</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.headerText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Nome da refeiÃ§Ã£o"
        style={styles.input}
      />

      {Object.keys(MEAL_TIMING_LABELS).map(key => (
        <TouchableOpacity key={key} onPress={() => setTiming(key as MealTiming)}>
          <Text style={[styles.timingButton, timing === key && styles.timingButtonActive]}>
            {MEAL_TIMING_LABELS[key]}
          </Text>
        </TouchableOpacity>
      ))}

      <ScrollView contentContainerStyle={styles.foodList}>
        {selectedFoods.map((item, index) => (
          <View key={index} style={styles.foodItem}>
            <Text style={styles.foodName}>{item.food.name}</Text>
            <TextInput
              value={item.grams.toString()}
              onChangeText={(text) => {
                const grams = Math.round(parseFloat(text));
                if (!isNaN(grams)) {
                  setSelectedFoods(
                    selectedFoods.map((foodItem, i) =>
                      i === index ? { ...foodItem, grams, macros: calculatePortionMacros(foodItem.food, grams) } : foodItem
                    )
                  );
                }
              }}
              keyboardType="numeric"
              style={styles.gramsInput}
            />
            <Text style={styles.portionCalories}>{Math.round(item.macros.calories)} cal</Text>
            <TouchableOpacity onPress={() => handleRemoveFood(index)}>
              <Text style={styles.removeButton}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.totalMacrosCard}>
        <Text style={styles.totalCalories}>{Math.round(sumMacros(selectedFoods.map(item => item.macros)).calories)} cal</Text>
        <Text style={styles.totalProtein}>{Math.round(sumMacros(selectedFoods.map(item => item.macros)).protein)}g P</Text>
        <Text style={styles.totalCarbs}>{Math.round(sumMacros(selectedFoods.map(item => item.macros)).carbs)}g C</Text>
        <Text style={styles.totalFat}>{Math.round(sumMacros(selectedFoods.map(item => item.macros)).fat)}g G</Text>
      </View>

      <View style={styles.foodSearch}>
        <TextInput
          placeholder="Procurar alimento"
          style={styles.searchInput}
        />
        <ScrollView contentContainerStyle={styles.searchResults}>
          {FOOD_DATABASE.map(food => (
            <TouchableOpacity key={food.id} onPress={() => handleAddFood(food)}>
              <Text style={styles.searchResult}>{food.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

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
  },
  headerText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
  },
  centerHeader: {
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timingButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  timingButtonActive: {
    backgroundColor: COLORS.primary,
  },
  foodList: {
    marginBottom: SPACING.lg,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  foodName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
  },
  gramsInput: {
    width: 60,
    height: 32,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    marginRight: SPACING.sm,
  },
  portionCalories: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  removeButton: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.error,
  },
  totalMacrosCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  totalCalories: {
    fontSize: FONT_SIZE.md,
    color: COLORS.calories,
  },
  totalProtein: {
    fontSize: FONT_SIZE.md,
    color: COLORS.protein,
  },
  totalCarbs: {
    fontSize: FONT_SIZE.md,
    color: COLORS.carbs,
  },
  totalFat: {
    fontSize: FONT_SIZE.md,
    color: COLORS.fat,
  },
  foodSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  searchResults: {
    maxHeight: 200,
  },
  searchResult: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
});

export default EditMealScreen;
