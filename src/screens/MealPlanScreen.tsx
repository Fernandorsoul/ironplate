import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { calculateMacros, calculateTDEE, calculateTargetCalories } from '../utils/calculations';
import { generateDietOptions, analyzeDiet } from '../utils/dietGenerator';
import { generateDietPDF, generateDietOptionsPDF } from '../utils/dietPdfGenerator';
import { formatFoodPortion } from '../utils/portionDisplay';
import { MealPlan, Goal } from '../types';
import { getSportOption } from '../constants/sports';

export default function MealPlanScreen({ navigation }: any) {
  const { profile, mealPlans, saveMealPlan, deleteMealPlan, setProfile, setActiveMealPlan } = useApp();
  const [selectedGoal, setSelectedGoal] = useState<Goal>(profile?.goal || 'maintenance');
  const [generatedOptions, setGeneratedOptions] = useState<MealPlan[]>([]);
  const [mealCount, setMealCount] = useState(8);
  const activePlan = mealPlans.find(plan => plan.isActive);

  const handleGeneratePlans = async () => {
    if (!profile) {
      Alert.alert('Erro', 'Configure seu perfil primeiro');
      return;
    }

    try {
      const updatedProfile = { ...profile, goal: selectedGoal };
      await setProfile(updatedProfile);
      
      const options = generateDietOptions(updatedProfile, mealCount);
      setGeneratedOptions(options);
    } catch (error) {
      console.error('Error generating plans:', error);
      Alert.alert('Erro', 'Não foi possível gerar os planos');
    }
  };

  const handleSavePlan = async (plan: MealPlan) => {
    await saveMealPlan(plan);
    Alert.alert('Sucesso', `Plano "${plan.name}" salvo!`);
  };

  const handleDeletePlan = (id: string) => {
    deleteMealPlan(id);
  };

  const handleChoosePlan = async (plan: MealPlan) => {
    await saveMealPlan({ ...plan, isActive: true });
    await setActiveMealPlan(plan.id);
    Alert.alert('Plano escolhido', 'Este plano agora aparece como seu plano alimentar atual.');
  };

  const getGoalInfo = (goal: Goal) => {
    switch (goal) {
      case 'cutting_conservative':
        return { label: 'Conservador', desc: 'Off-season (-15%)', icon: '🟢', color: '#00B894' };
      case 'cutting_preparation':
        return { label: 'Preparação', desc: '12-8 sem (-20%)', icon: '🟡', color: '#FDCB6E' };
      case 'cutting_precontest':
        return { label: 'Pré-Competição', desc: '8-4 sem (-25%)', icon: '🔴', color: '#FF6B6B' };
      case 'bulking':
        return { label: 'Bulking', desc: 'Ganhar massa (+15%)', icon: '💪', color: '#00B894' };
      case 'maintenance':
        return { label: 'Manutenção', desc: 'Manter peso', icon: '⚖️', color: '#00CEC9' };
    }
  };

  const getMacrosPreview = () => {
    if (!profile) return null;
    const previewProfile = { ...profile, goal: selectedGoal };
    const macros = calculateMacros(previewProfile);
    const tdee = calculateTDEE(previewProfile);
    const target = calculateTargetCalories(previewProfile);
    return { macros, tdee, target };
  };

  const preview = getMacrosPreview();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Planos Alimentares</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activePlan && (
          <View style={styles.activePlanCard}>
            <Text style={styles.activeBadge}>PLANO ALIMENTAR ESCOLHIDO</Text>
            <Text style={styles.activePlanTitle}>{activePlan.name}</Text>
            <Text style={styles.mealsTitle}>{activePlan.meals.length} refeições diárias</Text>
            {activePlan.meals.map(meal => (
              <View key={meal.id} style={styles.activeMeal}>
                <View style={styles.mealPreviewHeader}>
                  <Text style={styles.mealPreviewName}>{meal.name}</Text>
                  <Text style={styles.mealPreviewCalories}>{Math.round(meal.totalMacros.calories)} kcal</Text>
                </View>
                {meal.foods.map((portion, index) => (
                  <Text key={index} style={styles.mealPreviewFood}>{formatFoodPortion(portion)}</Text>
                ))}
              </View>
            ))}
            {!!activePlan.supplements?.length && (
              <View style={styles.supplementSection}>
                <Text style={styles.sectionTitle}>Suplementação sugerida</Text>
                {activePlan.supplements.map(item => (
                  <View key={item.name} style={styles.supplementItem}>
                    <Text style={styles.supplementName}>{item.name} · {item.dose}</Text>
                    <Text style={styles.supplementText}>{item.timing}</Text>
                    <Text style={styles.supplementText}>{item.reason}</Text>
                    {item.caution ? <Text style={styles.supplementCaution}>{item.caution}</Text> : null}
                  </View>
                ))}
                <Text style={styles.previewNote}>Sugestões gerais. Confirme suplementos com nutricionista ou médico.</Text>
              </View>
            )}
          </View>
        )}

        {/* Goal selector */}
        <Text style={styles.sectionTitle}>Escolha seu objetivo</Text>
        <Text style={styles.subsectionTitle}>Ganho de Massa</Text>
        <View style={styles.goalRow}>
          {(['bulking'] as Goal[]).map(goal => {
            const info = getGoalInfo(goal);
            const isSelected = selectedGoal === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[styles.goalCardSmall, isSelected && { borderColor: info.color, backgroundColor: info.color + '15' }]}
                onPress={() => setSelectedGoal(goal)}
              >
                <Text style={styles.goalIconSmall}>{info.icon}</Text>
                <Text style={[styles.goalLabelSmall, isSelected && { color: info.color }]}>{info.label}</Text>
                <Text style={styles.goalDescSmall}>{info.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subsectionTitle}>Perda de Gordura</Text>
        <View style={styles.goalRow}>
          {(['cutting_conservative', 'cutting_preparation', 'cutting_precontest'] as Goal[]).map(goal => {
            const info = getGoalInfo(goal);
            const isSelected = selectedGoal === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[styles.goalCardSmall, isSelected && { borderColor: info.color, backgroundColor: info.color + '15' }]}
                onPress={() => setSelectedGoal(goal)}
              >
                <Text style={styles.goalIconSmall}>{info.icon}</Text>
                <Text style={[styles.goalLabelSmall, isSelected && { color: info.color }]}>{info.label}</Text>
                <Text style={styles.goalDescSmall}>{info.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subsectionTitle}>Manutenção</Text>
        <View style={styles.goalRow}>
          {(['maintenance'] as Goal[]).map(goal => {
            const info = getGoalInfo(goal);
            const isSelected = selectedGoal === goal;
            return (
              <TouchableOpacity
                key={goal}
                style={[styles.goalCardSmall, isSelected && { borderColor: info.color, backgroundColor: info.color + '15' }]}
                onPress={() => setSelectedGoal(goal)}
              >
                <Text style={styles.goalIconSmall}>{info.icon}</Text>
                <Text style={[styles.goalLabelSmall, isSelected && { color: info.color }]}>{info.label}</Text>
                <Text style={styles.goalDescSmall}>{info.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Macros preview */}
        {preview && profile && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Preview das Macros</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>{preview.tdee}</Text>
                <Text style={styles.previewLabel}>TDEE</Text>
              </View>
              <Text style={styles.previewArrow}>→</Text>
              <View style={styles.previewItem}>
                <Text style={[styles.previewValue, { color: COLORS.primary }]}>{preview.target}</Text>
                <Text style={styles.previewLabel}>Meta</Text>
              </View>
            </View>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: COLORS.protein }]}>{preview.macros.protein}g</Text>
                <Text style={styles.macroLabel}>Proteína</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: COLORS.carbs }]}>{preview.macros.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbos</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: COLORS.fat }]}>{preview.macros.fat}g</Text>
                <Text style={styles.macroLabel}>Gordura</Text>
              </View>
            </View>
            <Text style={styles.previewNote}>
              {selectedGoal === 'cutting_conservative' ? 'Déficit de 15% - Perda gradual (0.3-0.5%/sem)' :
               selectedGoal === 'cutting_preparation' ? 'Déficit de 20% - Perda moderada (0.5-0.7%/sem)' :
               selectedGoal === 'cutting_precontest' ? 'Déficit de 25% - Perda agressiva (0.7-1.0%/sem)' :
               selectedGoal === 'bulking' ? 'Superávit de 15% - Ganho controlado' :
               'Calorias mantidas no nível de TDEE'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quantas refeições por dia?</Text>
        <View style={styles.mealCountRow}>
          {[3, 4, 5, 6, 7, 8].map(count => (
            <TouchableOpacity
              key={count}
              style={[styles.mealCountButton, mealCount === count && styles.mealCountButtonActive]}
              onPress={() => setMealCount(count)}
            >
              <Text style={[styles.mealCountText, mealCount === count && styles.mealCountTextActive]}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate button */}
        <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePlans}>
          <Text style={styles.generateButtonText}>Gerar 3 Opções de Cardápio</Text>
          <Text style={styles.generateButtonSubtext}>
            {getGoalInfo(selectedGoal).label} • {profile ? getSportOption(profile.sport).shortLabel : 'Atleta'}
          </Text>
        </TouchableOpacity>

        {/* Generated Options */}
        {generatedOptions.length > 0 && (
          <>
            <View style={styles.optionsHeader}>
              <Text style={styles.sectionTitle}>Opções Geradas</Text>
              <TouchableOpacity 
                style={styles.allPdfButton}
                onPress={() => profile && generateDietOptionsPDF(generatedOptions, profile)}
              >
                <Text style={styles.allPdfButtonText}>📄 PDF com 3 Opções</Text>
              </TouchableOpacity>
            </View>

            {generatedOptions.map((plan, index) => {
              const analysis = profile ? analyzeDiet(plan, profile) : null;
              return (
                <View key={plan.id} style={styles.optionCard}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionTitle}>Opção {index + 1}</Text>
                    <View style={styles.optionActions}>
                      <TouchableOpacity 
                        style={styles.saveOptionButton}
                        onPress={() => handleSavePlan(plan)}
                      >
                        <Text style={styles.saveOptionButtonText}>Salvar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.chooseOptionButton} onPress={() => handleChoosePlan(plan)}>
                        <Text style={styles.saveOptionButtonText}>Escolher</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Macros Summary */}
                  <View style={styles.optionMacros}>
                    <View style={styles.optionMacroItem}>
                      <Text style={[styles.optionMacroValue, { color: COLORS.calories }]}>{plan.totalMacros.calories}</Text>
                      <Text style={styles.optionMacroLabel}>kcal</Text>
                    </View>
                    <View style={styles.optionMacroItem}>
                      <Text style={[styles.optionMacroValue, { color: COLORS.protein }]}>{plan.totalMacros.protein}g</Text>
                      <Text style={styles.optionMacroLabel}>Proteína</Text>
                    </View>
                    <View style={styles.optionMacroItem}>
                      <Text style={[styles.optionMacroValue, { color: COLORS.carbs }]}>{plan.totalMacros.carbs}g</Text>
                      <Text style={styles.optionMacroLabel}>Carbos</Text>
                    </View>
                    <View style={styles.optionMacroItem}>
                      <Text style={[styles.optionMacroValue, { color: COLORS.fat }]}>{plan.totalMacros.fat}g</Text>
                      <Text style={styles.optionMacroLabel}>Gordura</Text>
                    </View>
                  </View>

                  {/* Analysis */}
                  {analysis && (
                    <View style={styles.analysisBadge}>
                      <Text style={styles.analysisText}>{analysis.adequacy} ({analysis.score}%)</Text>
                    </View>
                  )}

                  {/* Meals */}
                  {plan.meals.map((meal, i) => (
                    <View key={i} style={styles.mealPreview}>
                      <View style={styles.mealPreviewHeader}>
                        <Text style={styles.mealPreviewName}>{meal.name}</Text>
                        <Text style={styles.mealPreviewCalories}>{meal.totalMacros.calories} kcal</Text>
                      </View>
                      {meal.foods.map((food, j) => (
                        <Text key={j} style={styles.mealPreviewFood}>
                          {formatFoodPortion(food)}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        )}

        {/* Plans List */}
        <Text style={styles.sectionTitle}>Planos Salvos</Text>
        {mealPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum plano criado</Text>
            <Text style={styles.emptySubtext}>Escolha um objetivo e gere um plano automático</Text>
          </View>
        ) : (
          mealPlans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDate}>{new Date(plan.createdAt).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity onPress={() => setActiveMealPlan(plan.id)}>
                    <Text style={styles.choosePlanText}>{plan.isActive ? 'Em uso' : 'Usar plano'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => profile && generateDietPDF(plan, profile)}>
                    <Text style={styles.pdfButtonText}>📄</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('EditMealPlan', { plan })}>
                    <Text style={styles.editButton}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePlan(plan.id)}>
                    <Text style={styles.deleteButton}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.planMacros}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.calories }]}>{plan.totalMacros.calories}</Text>
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.protein }]}>{plan.totalMacros.protein}g</Text>
                  <Text style={styles.macroLabel}>Proteína</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.carbs }]}>{plan.totalMacros.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbos</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroValue, { color: COLORS.fat }]}>{plan.totalMacros.fat}g</Text>
                  <Text style={styles.macroLabel}>Gordura</Text>
                </View>
              </View>

              <Text style={styles.mealsTitle}>{plan.meals.length} refeições</Text>
              {plan.meals.map((meal, i) => (
                <View key={i} style={styles.mealItem}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>{meal.totalMacros.calories} kcal</Text>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

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
    marginBottom: SPACING.lg,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  activePlanCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 2, borderColor: COLORS.accent },
  activeBadge: { color: COLORS.accent, fontSize: FONT_SIZE.xs, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm },
  activePlanTitle: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: 'bold', textAlign: 'center' },
  activeMeal: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACING.sm },
  supplementSection: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  supplementItem: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  supplementName: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  supplementText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 3 },
  supplementCaution: { color: COLORS.warning, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
  mealCountRow: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.md },
  mealCountButton: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  mealCountButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceLight },
  mealCountText: { color: COLORS.textSecondary, fontWeight: '700' },
  mealCountTextActive: { color: COLORS.primary },
  goalGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  goalCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  goalIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  goalLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  goalDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  subsectionTitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  goalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  goalCardSmall: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalIconSmall: {
    fontSize: 20,
    marginBottom: 2,
  },
  goalLabelSmall: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  goalDescSmall: {
    color: COLORS.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  previewTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  previewItem: {
    alignItems: 'center',
  },
  previewValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  previewLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
  },
  previewArrow: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xl,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  macroLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  previewNote: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  generateButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  generateButtonSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  optionTitle: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  allPdfButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  allPdfButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  optionActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pdfButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  pdfButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  saveOptionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  chooseOptionButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  choosePlanText: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  saveOptionButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  optionMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  optionMacroItem: {
    alignItems: 'center',
  },
  optionMacroValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  optionMacroLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  analysisBadge: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  analysisText: {
    color: COLORS.accent,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  mealPreview: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  mealPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  mealPreviewName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  mealPreviewCalories: {
    color: COLORS.calories,
    fontSize: FONT_SIZE.sm,
  },
  mealPreviewFood: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginLeft: SPACING.sm,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  planActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  planName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  planDate: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  editButton: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
  },
  deleteButton: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
  },
  planMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  mealsTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
  },
  mealCalories: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
});
