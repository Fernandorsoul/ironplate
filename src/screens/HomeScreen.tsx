import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { isPhoneLayout, SMALL_PHONE_BREAKPOINT } from '../constants/layout';
import { useApp } from '../context/AppContext';
import { MacroCard, ActionButton, MealCard, ProfileAvatar } from '../components';
import { useMacros } from '../hooks';
import { calculateDailyEnergyExpenditure, calculateWorkoutCalories } from '../utils/calculations';

export default function HomeScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const { profile, targetMacros, todayLog, removeMealFromToday } = useApp();
  const { current, percentages } = useMacros(targetMacros, todayLog);
  const compactActions = isPhoneLayout(width);
  const isSmallPhone = width <= SMALL_PHONE_BREAKPOINT;
  const entranceAnimations = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0)),
  ).current;
  const calorieProgress = useRef(new Animated.Value(0)).current;
  const dailyExpenditure = useMemo(
    () => profile ? calculateDailyEnergyExpenditure(profile, todayLog?.workouts || []) : null,
    [profile, todayLog?.workouts],
  );

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | undefined;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (!mounted) return;
        if (reduceMotion) {
          entranceAnimations.forEach((value) => value.setValue(1));
          return;
        }

        animation = Animated.stagger(
          65,
          entranceAnimations.map((value) => Animated.timing(value, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })),
        );
        animation.start();
      });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [entranceAnimations]);

  useEffect(() => {
    const animation = Animated.timing(calorieProgress, {
      toValue: Math.min(Math.max(percentages.calories, 0), 100) / 100,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [calorieProgress, percentages.calories]);

  const entranceStyle = (index: number) => ({
    opacity: entranceAnimations[index],
    transform: [{
      translateY: entranceAnimations[index].interpolate({
        inputRange: [0, 1],
        outputRange: [16, 0],
      }),
    }],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isSmallPhone && styles.contentSmallPhone]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View style={[styles.header, entranceStyle(0)]}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.greeting}>Olá, {profile?.name || 'Atleta'}!</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <ProfileAvatar name={profile?.name} photoUri={profile?.photoUri} />
        </TouchableOpacity>
      </Animated.View>

      {/* Calorie Ring */}
      <Animated.View style={[styles.calorieCard, entranceStyle(1)]}>
        <View style={styles.calorieCircle}>
          <Text style={styles.calorieNumber}>{current.calories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>
        <Text style={styles.calorieTarget}>Meta: {targetMacros?.calories || 0} kcal</Text>
        <View style={styles.calorieBar}>
          <Animated.View style={[styles.calorieBarFill, { transform: [{ scaleX: calorieProgress }] }]} />
        </View>
      </Animated.View>

      {dailyExpenditure && (
        <Animated.View style={[styles.expenditureCard, entranceStyle(2)]}>
          <Text style={styles.expenditureTitle}>Gasto diário estimado</Text>
          <Text style={styles.expenditureValue}>{dailyExpenditure.totalExpenditure} kcal</Text>
          <View style={styles.expenditureBreakdown}>
            <Text style={styles.expenditureDetail}>Base: {dailyExpenditure.baseExpenditure} kcal</Text>
            <Text style={styles.expenditureDetail}>Treinos: +{dailyExpenditure.workoutExpenditure} kcal</Text>
          </View>
          <Text style={styles.estimateNote}>Estimativa baseada no tipo, intensidade e duração dos treinos.</Text>
        </Animated.View>
      )}

      {/* Macros Grid */}
      <Animated.View style={[styles.macrosGrid, entranceStyle(3)]}>
        <MacroCard label="Proteína" current={current.protein} target={targetMacros?.protein || 0} color={COLORS.protein} percentage={percentages.protein} />
        <MacroCard label="Carboidratos" current={current.carbs} target={targetMacros?.carbs || 0} color={COLORS.carbs} percentage={percentages.carbs} />
        <MacroCard label="Gordura" current={current.fat} target={targetMacros?.fat || 0} color={COLORS.fat} percentage={percentages.fat} />
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View style={entranceStyle(4)}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsGrid}>
          <ActionButton compact={compactActions} icon="+" label="Refeição" onPress={() => navigation.navigate('AddMeal')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="🏋️" label="Treino" onPress={() => navigation.navigate('AddWorkout')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="⚖️" label="Peso" onPress={() => navigation.navigate('Weight')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="📊" label="Plano" onPress={() => navigation.navigate('MealPlan')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="📈" label="Resumo" onPress={() => navigation.navigate('WeeklySummary')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="📏" label="Medidas" onPress={() => navigation.navigate('BodyMeasurements')} color={COLORS.primary} />
          <ActionButton compact={compactActions} icon="📉" label="Evolução" onPress={() => navigation.navigate('Evolution')} color={COLORS.primary} />
        </View>
      </Animated.View>

      <Animated.View style={entranceStyle(5)}>
        {/* Today's Meals */}
        <Text style={styles.sectionTitle}>Refeições de Hoje</Text>
        {todayLog?.meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhuma refeição registrada hoje</Text>
            <Text style={styles.emptySubtext}>Toque em "+" para adicionar</Text>
          </View>
        ) : (
          todayLog?.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={removeMealFromToday} />
          ))
        )}

        {/* Today's Workouts */}
        <Text style={styles.sectionTitle}>Treinos de Hoje</Text>
        {todayLog?.workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum treino registrado</Text>
          </View>
        ) : (
          todayLog?.workouts.map((workout, index) => (
            <View key={index} style={styles.workoutCard}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutCalories}>
                {profile ? calculateWorkoutCalories(workout, profile.weight) : 0} kcal estimadas
              </Text>
              <Text style={styles.workoutDetails}>{workout.duration} min • {workout.intensity}</Text>
            </View>
          ))
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  contentSmallPhone: {
    paddingHorizontal: SPACING.sm,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  profileButton: {
    padding: SPACING.xs,
  },
  greeting: {
    flexShrink: 1,
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  date: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  calorieCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  expenditureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  expenditureTitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  expenditureValue: { color: COLORS.accent, fontSize: FONT_SIZE.xxl, fontWeight: 'bold', textAlign: 'center', marginVertical: SPACING.sm },
  expenditureBreakdown: { flexDirection: 'row', justifyContent: 'space-between' },
  expenditureDetail: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  estimateNote: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', marginTop: SPACING.sm },
  calorieCircle: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calorieNumber: {
    fontSize: FONT_SIZE.hero,
    fontWeight: 'bold',
    color: COLORS.calories,
  },
  calorieLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  calorieTarget: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  calorieBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  calorieBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.calories,
    borderRadius: BORDER_RADIUS.full,
    transformOrigin: 'left center',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  actionsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  workoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  workoutName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  workoutDetails: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  workoutCalories: { color: COLORS.accent, fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: SPACING.xs },
});
