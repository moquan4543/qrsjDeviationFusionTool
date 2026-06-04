import { useState, useCallback } from 'react';
import { UserInventoryDeviant, GoalConfiguration, SolverResult } from '@/types';
import { calculateFusionPath } from '@/lib/solver';

export const useDeviantSolver = () => {
  const [loading, setLoading] = useState(false);

  const solve = useCallback((
    inventory: UserInventoryDeviant[],
    goal: GoalConfiguration
  ): SolverResult => {
    setLoading(true);
    const result = calculateFusionPath(inventory, goal);
    setLoading(false);
    return result;
  }, []);

  return { solve, loading };
};
