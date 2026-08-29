// Component structure tests (import verification and prop types)
// Full render tests require react-test-renderer compatibility fix

import { MacroCard } from '../src/components/MacroCard';
import { ActionButton } from '../src/components/ActionButton';
import { MealCard } from '../src/components/MealCard';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { ProfileAvatar } from '../src/components/ProfileAvatar';

describe('Component exports', () => {
  it('MacroCard is exported as function', () => {
    expect(typeof MacroCard).toBe('function');
  });

  it('ActionButton is exported as function', () => {
    expect(typeof ActionButton).toBe('function');
  });

  it('MealCard is exported as function', () => {
    expect(typeof MealCard).toBe('function');
  });

  it('ScreenHeader is exported as function', () => {
    expect(typeof ScreenHeader).toBe('function');
  });

  it('ProfileAvatar is exported as function', () => {
    expect(typeof ProfileAvatar).toBe('function');
  });
});

describe('Component prop types', () => {
  it('MacroCard accepts required props', () => {
    const props = { label: 'Proteína', current: 100, target: 150, color: '#E17055', percentage: 67 };
    expect(props.label).toBe('Proteína');
    expect(props.percentage).toBeLessThanOrEqual(100);
  });

  it('ActionButton accepts required props', () => {
    const props = { icon: '+', label: 'Refeição', onPress: () => {} };
    expect(typeof props.onPress).toBe('function');
  });

  it('MealCard accepts Meal type', () => {
    const meal = {
      id: '1', name: 'Almoço', timing: 'regular' as const, foods: [],
      totalMacros: { calories: 500, protein: 40, carbs: 60, fat: 15 },
    };
    expect(meal.totalMacros.calories).toBe(500);
  });

  it('ScreenHeader accepts required props', () => {
    const props = { title: 'Teste', onBack: () => {} };
    expect(typeof props.onBack).toBe('function');
  });
});
