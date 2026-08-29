import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DietAlternativesSection } from '../src/components/DietAlternativesSection';
import { HydrationCard } from '../src/components/HydrationCard';
import { TACO_DATABASE } from '../src/constants/taco';
import { calculatePortionMacros } from '../src/utils/calculations';
import { MealPlan, UserProfile } from '../src/types';

const profile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 80,
  height: 180,
  gender: 'female',
  activityLevel: 'active',
  goal: 'maintenance',
  sport: 'bjj',
};

describe('nutrition planning features', () => {
  it('shows the calculated hydration target and training adjustment', async () => {
    await render(<HydrationCard profile={profile} />);

    expect(screen.getByText('Meta inicial de líquidos: 2,8 L por dia')).toBeTruthy();
    expect(screen.getByText(/400 a 800 ml por hora/)).toBeTruthy();
    expect(screen.getByText(/treinos longos de BJJ/)).toBeTruthy();
  });

  it('expands the cheaper food substitutions', async () => {
    const food = TACO_DATABASE.find(item => item.id === 'taco_045');
    if (!food) throw new Error('Salmon fixture not found');
    const macros = calculatePortionMacros(food, 150);
    const plan: MealPlan = {
      id: 'plan-1',
      name: 'Plano teste',
      goal: 'maintenance',
      meals: [{
        id: 'meal-1',
        name: 'Jantar',
        timing: 'regular',
        foods: [{ food, grams: 150, macros }],
        totalMacros: macros,
      }],
      totalMacros: macros,
      createdAt: '2026-08-29T00:00:00.000Z',
    };

    await render(<DietAlternativesSection plan={plan} />);
    await fireEvent.press(screen.getByText('Substituições e economia'));

    expect(screen.getByText('Mais baratas')).toBeTruthy();
    expect(screen.getByText(/Peito de frango/)).toBeTruthy();
    expect(screen.getAllByText('TENDE A CUSTAR MENOS').length).toBeGreaterThan(0);
  });
});
