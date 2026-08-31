// Layout render tests (spacing and icon consistency regression guards)
// Verify the Home quick-action buttons and the MealCard macros row render correctly

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ActionButton } from '../src/components/ActionButton';
import { MealCard } from '../src/components/MealCard';
import type { Meal } from '../src/types';

describe('ActionButton quick action layout', () => {
  it('renders the icon and the label', async () => {
    await render(<ActionButton icon="+" label="Refeição" onPress={() => {}} />);
    expect(screen.getByText('+')).toBeTruthy();
    expect(screen.getByText('Refeição')).toBeTruthy();
  });

  it('renders a long label without crashing', async () => {
    const longLabel = 'Refeição principal do dia';
    await render(<ActionButton icon="+" label={longLabel} onPress={() => {}} />);
    expect(screen.getByText(longLabel)).toBeTruthy();
  });

  it('uses a bounded two-column width in the compact layout', async () => {
    const onPress = jest.fn();
    await render(<ActionButton compact icon="+" label="Refeição" onPress={onPress} />);

    const containerStyle = StyleSheet.flatten(
      screen.getByTestId('quick-action-container-Refeição').props.style,
    );
    expect(containerStyle.flexBasis).toBe('48%');
    expect(containerStyle.flexShrink).toBe(1);
    expect(containerStyle.minWidth).toBe(0);

    await fireEvent.press(screen.getByLabelText('Abrir Refeição'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('MealCard macros row layout', () => {
  const sampleMeal: Meal = {
    id: '1',
    name: 'Almoço',
    timing: 'regular',
    foods: [],
    totalMacros: { calories: 500, protein: 40, carbs: 60, fat: 15 },
  };

  it('renders the meal name and the four macro values with labels', async () => {
    await render(<MealCard meal={sampleMeal} />);
    expect(screen.getByText('Almoço')).toBeTruthy();
    expect(screen.getByText('500 kcal')).toBeTruthy();
    expect(screen.getByText('P: 40g')).toBeTruthy();
    expect(screen.getByText('C: 60g')).toBeTruthy();
    expect(screen.getByText('G: 15g')).toBeTruthy();
  });
});
