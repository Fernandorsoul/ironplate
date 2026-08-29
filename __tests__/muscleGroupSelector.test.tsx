import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  MuscleGroupSelector,
  toggleMuscleGroup,
} from '../src/components/MuscleGroupSelector';

describe('MuscleGroupSelector', () => {
  it('renders template groups as selected and lets the user edit them', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <MuscleGroupSelector selectedGroups={['chest', 'biceps']} onChange={onChange} />,
    );

    expect(getByTestId('muscle-group-chest').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('muscle-group-back').props.accessibilityState).toEqual({ selected: false });

    await fireEvent.press(getByTestId('muscle-group-back'));
    expect(onChange).toHaveBeenCalledWith(['chest', 'biceps', 'back']);
  });

  it('keeps full body mutually exclusive with individual groups', () => {
    expect(toggleMuscleGroup(['full_body'], 'chest')).toEqual(['chest']);
    expect(toggleMuscleGroup(['chest', 'back'], 'full_body')).toEqual(['full_body']);
    expect(toggleMuscleGroup(['chest', 'back'], 'back')).toEqual(['chest']);
  });
});
