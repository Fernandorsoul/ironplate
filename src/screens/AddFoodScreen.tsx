import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, FlatList } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useOnlineFoodSearch } from '../hooks';
import { Food } from '../types';
import * as Crypto from 'expo-crypto';

const CATEGORIES = [
  'Proteína', 'Carboidrato', 'Gordura', 'Fruta', 'Verdura', 'Laticínio',
  'Carnes e derivados', 'Pescados e frutos do mar', 'Cereais e derivados',
  'Bebida', 'Industrializados', 'Nozes e sementes', 'Outro'
];

const AddFoodScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(true);

  const { addCustomFood } = useApp();
  const { results: onlineResults, isLoading: isSearching, error: searchError, search, clearResults } = useOnlineFoodSearch();

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 3) {
      search(text);
    } else {
      clearResults();
    }
  }, [search, clearResults]);

  const handleSelectOnlineFood = useCallback((food: Food) => {
    setName(food.name);
    setCategory(food.category);
    setCalories(food.macros.calories.toString());
    setProtein(food.macros.protein.toString());
    setCarbs(food.macros.carbs.toString());
    setFat(food.macros.fat.toString());
    setShowSearch(false);
    clearResults();
  }, [clearResults]);

  const handleSave = async () => {
    const cal = parseFloat(calories) || 0;
    const prot = parseFloat(protein) || 0;
    const carb = parseFloat(carbs) || 0;
    const ft = parseFloat(fat) || 0;

    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome do alimento');
      return;
    }
    if (cal === 0 && prot === 0 && carb === 0 && ft === 0) {
      Alert.alert('Erro', 'Preencha pelo menos uma macro');
      return;
    }

    const newFood: Food = {
      id: Crypto.randomUUID(),
      name: name.trim(),
      macros: { calories: cal, protein: prot, carbs: carb, fat: ft },
      category: category || 'Outro',
    };

    try {
      await addCustomFood(newFood);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar alimento');
    }
  };

  const renderOnlineResult = ({ item }: { item: Food }) => (
    <TouchableOpacity style={styles.searchResult} onPress={() => handleSelectOnlineFood(item)}>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.searchResultCategory}>{item.category}</Text>
      </View>
      <View style={styles.searchResultMacros}>
        <Text style={styles.searchResultCal}>{Math.round(item.macros.calories)} kcal</Text>
        <Text style={styles.searchResultMacro}>P: {item.macros.protein}g</Text>
        <Text style={styles.searchResultMacro}>C: {item.macros.carbs}g</Text>
        <Text style={styles.searchResultMacro}>G: {item.macros.fat}g</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, styles.centerHeader]}>Novo Alimento</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerText, styles.saveText]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Busca Online */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Buscar na Internet</Text>
          <Text style={styles.sectionSubtitle}>
            Digite o nome do produto para buscar informacoes nutricionais automaticamente
          </Text>

          <View style={styles.searchInputContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Ex: café dolce gusto, whey protein, peito de frango..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              autoFocus={showSearch}
            />
            {isSearching && <ActivityIndicator style={styles.searchLoader} color={COLORS.primary} />}
          </View>

          {searchError && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}

          {onlineResults.length > 0 && (
            <View style={styles.searchResults}>
              <Text style={styles.resultsCount}>{onlineResults.length} produtos encontrados</Text>
              {onlineResults.map((food, index) => (
                <TouchableOpacity
                  key={food.id || index}
                  style={styles.searchResult}
                  onPress={() => handleSelectOnlineFood(food)}
                >
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName} numberOfLines={2}>{food.name}</Text>
                    <Text style={styles.searchResultCategory}>{food.category}</Text>
                  </View>
                  <View style={styles.searchResultMacros}>
                    <Text style={styles.searchResultCal}>{Math.round(food.macros.calories)} kcal</Text>
                    <View style={styles.macroRow}>
                      <Text style={[styles.searchResultMacro, { color: COLORS.protein }]}>P: {food.macros.protein}g</Text>
                      <Text style={[styles.searchResultMacro, { color: COLORS.carbs }]}>C: {food.macros.carbs}g</Text>
                      <Text style={[styles.searchResultMacro, { color: COLORS.fat }]}>G: {food.macros.fat}g</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length >= 3 && !isSearching && onlineResults.length === 0 && !searchError && (
            <Text style={styles.noResults}>Nenhum produto encontrado. Tente outro termo.</Text>
          )}
        </View>

        {/* Separador */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou preencha manualmente</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Formulario Manual */}
        <View style={styles.manualSection}>
          <Text style={styles.sectionTitle}>Informacoes do Alimento</Text>

          <Text style={styles.label}>Nome do Alimento *</Text>
          <TextInput
            value={name}
            onChangeText={(text) => { setName(text); setShowSearch(false); }}
            placeholder="Ex: Café pingado"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.categoryButton, category === cat && styles.categoryButtonActive]}
              >
                <Text style={[styles.categoryButtonText, category === cat && styles.categoryButtonTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Macros (por 100g)</Text>
          <View style={styles.macroGrid}>
            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: COLORS.calories }]}>Calorias</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.macroInput, { borderColor: COLORS.calories }]}
              />
              <Text style={styles.macroUnit}>kcal</Text>
            </View>

            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: COLORS.protein }]}>Proteína</Text>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.macroInput, { borderColor: COLORS.protein }]}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: COLORS.carbs }]}>Carboidratos</Text>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.macroInput, { borderColor: COLORS.carbs }]}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroField}>
              <Text style={[styles.macroLabel, { color: COLORS.fat }]}>Gordura</Text>
              <TextInput
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.macroInput, { borderColor: COLORS.fat }]}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          {/* Preview */}
          {(calories || protein || carbs || fat) ? (
            <View style={styles.preview}>
              <Text style={styles.previewTitle}>Preview (por 100g)</Text>
              <View style={styles.previewMacros}>
                <Text style={[styles.previewMacro, { color: COLORS.calories }]}>
                  {Math.round(parseFloat(calories) || 0)} kcal
                </Text>
                <Text style={[styles.previewMacro, { color: COLORS.protein }]}>
                  P: {parseFloat(protein) || 0}g
                </Text>
                <Text style={[styles.previewMacro, { color: COLORS.carbs }]}>
                  C: {parseFloat(carbs) || 0}g
                </Text>
                <Text style={[styles.previewMacro, { color: COLORS.fat }]}>
                  G: {parseFloat(fat) || 0}g
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  centerHeader: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.lg,
  },
  saveText: {
    fontWeight: 'bold',
  },
  content: {
    padding: SPACING.md,
  },
  searchSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  searchLoader: {
    position: 'absolute',
    right: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  searchResults: {
    marginTop: SPACING.md,
  },
  resultsCount: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  searchResult: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  searchResultName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  searchResultCategory: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  searchResultMacros: {
    alignItems: 'flex-end',
  },
  searchResultCal: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  searchResultMacro: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 2,
  },
  noResults: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginHorizontal: SPACING.md,
  },
  manualSection: {
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryScroll: {
    marginBottom: SPACING.sm,
  },
  categoryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  categoryButtonTextActive: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  macroField: {
    flex: 1,
    minWidth: '45%',
  },
  macroLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  macroInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    borderWidth: 1,
    textAlign: 'center',
  },
  macroUnit: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: 2,
  },
  preview: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  previewTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  previewMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  previewMacro: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});

export default AddFoodScreen;
