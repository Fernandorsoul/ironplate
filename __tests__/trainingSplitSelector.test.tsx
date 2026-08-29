import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TrainingSplitSelector } from '../src/components/TrainingSplitSelector';

describe('TrainingSplitSelector', () => {
  it('shows the selected split and lets the user choose chest with biceps', async () => {
    const onSelectSplit = jest.fn();
    const onSelectDay = jest.fn();

    await render(
      <TrainingSplitSelector
        selectedSplitId="abc_antagonist"
        selectedDayId="back_triceps"
        onSelectSplit={onSelectSplit}
        onSelectDay={onSelectDay}
      />,
    );

    expect(screen.getByText('A — Peito e bíceps')).toBeTruthy();
    expect(screen.getByText('B — Costas e tríceps')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('training-day-chest_biceps'));

    expect(onSelectDay).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chest_biceps',
      muscleGroups: ['chest', 'biceps'],
    }));
  });
});
