import { useMemo } from 'react';
import { Food } from '../types';

export function useFoodSearch(allFoods: Food[], searchQuery: string): Food[] {
  return useMemo(() => {
    if (!searchQuery.trim()) return allFoods;
    const query = searchQuery.toLowerCase();
    return allFoods.filter(food => food.name.toLowerCase().includes(query));
  }, [allFoods, searchQuery]);
}
