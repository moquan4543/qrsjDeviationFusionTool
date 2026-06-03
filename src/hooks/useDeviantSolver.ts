import { useState, useCallback } from 'react';
import { Abnormality, Trait, UserInventoryDeviant, GoalConfiguration, MissingRequirement, SolverResult, TraitCategory } from '@/types';
import { getAbnormalities, getTraits } from '@/lib/data';

export interface FusionStep {
  target: {
    abnormalityId: string;
    traitIds: string[];
    ability: number;
    activity: number;
  };
  left: FusionNode;
  right: FusionNode;
  mids: FusionNode[];
  isPartial?: boolean;
}

export type FusionNode = 
  | { type: 'inventory'; id: string; abnormalityId: string; traitIds: string[]; ability: number; activity: number }
  | { type: 'step'; step: FusionStep }
  | { type: 'mutation_material'; traitId: string; traitName: string; materialName: string }
  | { type: 'missing'; requirement: MissingRequirement };

export const useDeviantSolver = () => {
  const [loading, setLoading] = useState(false);

  const solve = useCallback((
    inventory: UserInventoryDeviant[],
    goal: GoalConfiguration
  ): SolverResult => {
    setLoading(true);
    const abnormalities = getAbnormalities();
    const allTraits = getTraits();
    const missingElements: MissingRequirement[] = [];

    const inventoryCounts = new Map<string, number>();
    inventory.forEach(item => inventoryCounts.set(item.id, item.count));

    const isAvailable = (item: UserInventoryDeviant) => (inventoryCounts.get(item.id) ?? 0) > 0;
    const consumeItem = (item: UserInventoryDeviant) => {
        inventoryCounts.set(item.id, (inventoryCounts.get(item.id) ?? 1) - 1);
    };

    const find55Parent = (abId: string | undefined, excludeIds: Set<string> = new Set()): UserInventoryDeviant | undefined => {
        // Try exact species first
        const exact = abId ? inventory.find(item => 
            item.abnormalityId === abId && 
            item.ability === 5 && item.activity === 5 &&
            isAvailable(item) &&
            !excludeIds.has(item.id)
        ) : undefined;
        if (exact) return exact;

        // Fallback to any 5,5 fodder as a dummy parent
        return inventory.find(item => 
            item.ability === 5 && item.activity === 5 &&
            isAvailable(item) &&
            !excludeIds.has(item.id)
        );
    };

    const checkStepSafety = (
        targetAbnormalityId: string,
        targetTraits: string[],
        left: FusionNode,
        right: FusionNode,
        mids: FusionNode[]
    ) => {
        const traitFreq = new Map<string, number>();
        const categoryFreq = new Map<string, number>();
        
        // Species Weight Logic (Fix 7/8 specific interpretation)
        // Offspring species is rolled between parents and applicable mid-slot items.
        // We identify the species of the two parents.
        const getSpecies = (node: FusionNode) => {
            if (node.type === 'inventory') return node.abnormalityId;
            if (node.type === 'step') return node.step.target.abnormalityId;
            return null;
        };
        const leftSpecies = getSpecies(left);
        const rightSpecies = getSpecies(right);
        
        // Applicable species for the roll are the target species and the other parent's species.
        // Any third species in mid slots is typically ignored for the offspring species roll in this implementation.
        let targetSpeciesPoints = 0;
        let otherParentSpeciesPoints = 0;

        const allNodes = [left, right, ...mids];

        allNodes.forEach(node => {
            if (!node || node.type === 'missing') return;

            let nodeTraits: string[] = [];
            let nodeSpecies: string | null = null;
            let multiplier = 1;

            if (node.type === 'inventory') {
                nodeTraits = node.traitIds;
                nodeSpecies = node.abnormalityId;
            } else if (node.type === 'step') {
                nodeTraits = node.step.target.traitIds;
                nodeSpecies = node.step.target.abnormalityId;
            } else if (node.type === 'mutation_material') {
                nodeTraits = [node.traitId];
                multiplier = 2; // Mutation materials count double
            }

            if (nodeSpecies) {
                if (nodeSpecies === targetAbnormalityId) {
                    targetSpeciesPoints += 1;
                } else if (nodeSpecies === rightSpecies || nodeSpecies === leftSpecies) {
                    otherParentSpeciesPoints += 1;
                }
                // Note: Third species (neither T nor D) are effectively excluded from the denominator
                // to allow trait-carrying fodders to not pollute the species roll.
            }

            // An item increments the counter for ALL of its traits at once
            nodeTraits.forEach(tid => {
                const traitMeta = allTraits.find(t => t.id === tid);
                const cat = traitMeta?.category || '通用';
                traitFreq.set(tid, (traitFreq.get(tid) || 0) + multiplier);
                categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + multiplier);
            });
        });

        const missingTraits: string[] = [];
        targetTraits.forEach(tid => {
            const freq = traitFreq.get(tid) || 0;
            const traitMeta = allTraits.find(t => t.id === tid);
            const cat = traitMeta?.category || '通用';
            const total = categoryFreq.get(cat) || 0;
            
            if (freq < 2 || (freq / total < 0.666)) {
                missingTraits.push(tid);
            }
        });

        const totalApplicablePoints = targetSpeciesPoints + otherParentSpeciesPoints;
        const speciesShare = totalApplicablePoints > 0 ? targetSpeciesPoints / totalApplicablePoints : 0;
        const isSpeciesSafe = speciesShare >= 0.666;

        return {
            isSafe: missingTraits.length === 0 && isSpeciesSafe,
            missingTraits,
            isSpeciesSafe
        };
    };

    const enforceInheritance = (node: FusionNode, targetAbnormalityId: string, targetTraits: string[]): FusionNode => {
        if (node.type !== 'step') return node;
        
        const step = node.step;
        
        // Step 1: Identify Mutation Requirements
        const mandatoryMids: FusionNode[] = [];
        targetTraits.forEach(tid => {
            const trait = allTraits.find(t => t.id === tid);
            if (trait?.category === '變異') {
                const materialName = trait.description.match(/【(.*?)】/) ? trait.description.match(/【(.*?)】/)![1] : "指定變異材料";
                mandatoryMids.push({
                    type: 'mutation_material',
                    traitId: tid,
                    traitName: trait.name,
                    materialName: materialName
                });
            }
        });

        // Step 2: Gather Candidate Pool
        const remainingSlots = Math.max(0, 3 - mandatoryMids.length);
        const candidatePool: UserInventoryDeviant[] = [];
        
        inventory.forEach(item => {
            const count = inventoryCounts.get(item.id) || 0;
            if (count <= 0) return;
            
            const matchesSpecies = item.abnormalityId === targetAbnormalityId;
            const matchesTraits = targetTraits.some(tt => item.traits.includes(tt));
            
            if (matchesSpecies || matchesTraits) {
                // Add up to 'remainingSlots' instances of this item to the pool
                const toAdd = Math.min(count, remainingSlots);
                for (let i = 0; i < toAdd; i++) {
                    candidatePool.push(item);
                }
            }
        });

        // Sort to prioritize items with more target traits, then species match, then higher stats
        candidatePool.sort((a, b) => {
            const aTraits = targetTraits.filter(tt => a.traits.includes(tt)).length;
            const bTraits = targetTraits.filter(tt => b.traits.includes(tt)).length;
            if (aTraits !== bTraits) return bTraits - aTraits;
            
            const aSpecies = a.abnormalityId === targetAbnormalityId ? 1 : 0;
            const bSpecies = b.abnormalityId === targetAbnormalityId ? 1 : 0;
            if (aSpecies !== bSpecies) return bSpecies - aSpecies;

            return (b.ability + b.activity) - (a.ability + a.activity);
        });

        const limitedPool = candidatePool.slice(0, 12);

        // Step 3: Permutation Search (Combinations)
        const getCombinations = <T>(array: T[], n: number): T[][] => {
            if (n === 0) return [[]];
            const result: T[][] = [];
            for (let i = 0; i <= array.length - n; i++) {
                const subCombos = getCombinations(array.slice(i + 1), n - 1);
                for (const sub of subCombos) {
                    result.push([array[i], ...sub]);
                }
            }
            return result;
        };

        let bestResult: { mids: FusionNode[], safety: any } | null = null;
        let foundSafe = false;

        // Try combinations of size 0 up to remainingSlots
        for (let count = 0; count <= remainingSlots; count++) {
            const combos = getCombinations(limitedPool, count);
            for (const combo of combos) {
                const currentMids = [
                    ...mandatoryMids,
                    ...combo.map(item => ({
                        type: 'inventory' as const,
                        id: item.id,
                        abnormalityId: item.abnormalityId,
                        traitIds: item.traits,
                        ability: item.ability,
                        activity: item.activity
                    }))
                ];
                
                const safety = checkStepSafety(targetAbnormalityId, targetTraits, step.left, step.right, currentMids);
                if (safety.isSafe) {
                    bestResult = { mids: currentMids, safety };
                    foundSafe = true;
                    break;
                }
                
                // Track best effort: fewer missing traits, then species safety
                if (!bestResult || 
                    safety.missingTraits.length < bestResult.safety.missingTraits.length ||
                    (safety.missingTraits.length === bestResult.safety.missingTraits.length && safety.isSpeciesSafe && !bestResult.safety.isSpeciesSafe)) {
                    bestResult = { mids: currentMids, safety };
                }
            }
            if (foundSafe) break;
        }

        if (bestResult) {
            step.mids = bestResult.mids;
            if (!bestResult.safety.isSafe) {
                step.isPartial = true;
                // Add missing nodes as fallback
                bestResult.safety.missingTraits.forEach((tid: string) => {
                    const trait = allTraits.find(t => t.id === tid);
                    const traitName = trait?.name || tid;
                    step.mids.push({
                        type: 'missing',
                        requirement: {
                            type: 'trait',
                            name: traitName,
                            purpose: `繼承機率未達 100%（需出現 2 次且佔比 >= 66.7%）。`
                        }
                    });
                });
                if (!bestResult.safety.isSpeciesSafe) {
                    const abName = abnormalities.find(a => a.id === targetAbnormalityId)?.name || targetAbnormalityId;
                    step.mids.push({
                        type: 'missing',
                        requirement: {
                            type: 'species',
                            name: abName,
                            purpose: `物種權重不足 (需 >= 66.7%)。`
                        }
                    });
                }
            }

            // Consume picked items
            bestResult.mids.forEach(m => {
                if (m.type === 'inventory') {
                    const item = inventory.find(i => i.id === m.id);
                    if (item) consumeItem(item);
                }
            });
        }

        return node;
    };

    const findPath = (
        targetAbnormalityId: string, 
        neededTraitIds: string[], 
        depth: number = 0, 
        visited: Set<string> = new Set()
    ): FusionNode => {
      const targetAb = abnormalities.find(a => a.id === targetAbnormalityId);
      const abName = targetAb?.name || targetAbnormalityId;

      if (depth > 8) {
        return { type: 'missing', requirement: { type: 'species', name: abName, purpose: "超過最大遞迴深度" } };
      }

      const sortedTraits = [...neededTraitIds].sort();
      const currentPathKey = `${targetAbnormalityId}:${sortedTraits.join(',')}`;
      if (visited.has(currentPathKey)) {
          return { 
              type: 'missing', 
              requirement: { 
                  type: 'species', 
                  name: abName, 
                  purpose: "檢測到無限遞迴（目標重複要求自身作為父本）" 
              } 
          };
      }
      
      const newVisited = new Set(visited);
      newVisited.add(currentPathKey);

      // 1. Exact Match Check (Inventory)
      const exactMatch = inventory.find(item => 
          item.abnormalityId === targetAbnormalityId && 
          item.ability === 5 && item.activity === 5 &&
          neededTraitIds.every(nt => item.traits.includes(nt)) &&
          isAvailable(item)
      );
      if (exactMatch) {
          consumeItem(exactMatch);
          return { 
              type: 'inventory', 
              id: exactMatch.id, 
              abnormalityId: exactMatch.abnormalityId, 
              traitIds: exactMatch.traits,
              ability: exactMatch.ability,
              activity: exactMatch.activity
          };
      }

      // 2. Inventory-First Strategy (Multi-Species Proxy Rule)
      const p1 = find55Parent(targetAbnormalityId);
      if (p1) {
          const p2 = find55Parent(targetAbnormalityId, new Set([p1.id])) || find55Parent(undefined, new Set([p1.id]));
          if (p2) {
              consumeItem(p1);
              consumeItem(p2);
              
              const step: FusionStep = {
                  target: { abnormalityId: targetAbnormalityId, traitIds: neededTraitIds, ability: 5, activity: 5 },
                  left: { type: 'inventory', id: p1.id, abnormalityId: p1.abnormalityId, traitIds: p1.traits, ability: p1.ability, activity: p1.activity },
                  right: { type: 'inventory', id: p2.id, abnormalityId: p2.abnormalityId, traitIds: p2.traits, ability: p2.ability, activity: p2.activity },
                  mids: [],
                  isPartial: false
              };
              
              return enforceInheritance({ type: 'step', step }, targetAbnormalityId, neededTraitIds);
          }
      }

      // 3. Recursive Fallback
      const leftTraits = neededTraitIds.slice(0, Math.ceil(neededTraitIds.length / 2));
      const rightTraits = neededTraitIds.slice(Math.ceil(neededTraitIds.length / 2));

      const leftNode = findPath(targetAbnormalityId, leftTraits, depth + 1, newVisited);
      
      const inventoryP2 = find55Parent(undefined); 
      let rightNode: FusionNode;
      if (inventoryP2 && leftNode.type !== 'missing') {
           consumeItem(inventoryP2);
           rightNode = { 
               type: 'inventory', 
               id: inventoryP2.id, 
               abnormalityId: inventoryP2.abnormalityId, 
               traitIds: inventoryP2.traits, 
               ability: 5, 
               activity: 5 
           };
      } else {
           rightNode = findPath(targetAbnormalityId, rightTraits, depth + 1, newVisited);
      }

      const resStep: FusionNode = {
        type: 'step',
        step: {
          target: { abnormalityId: targetAbnormalityId, traitIds: neededTraitIds, ability: 5, activity: 5 },
          left: leftNode,
          right: rightNode,
          mids: [],
          isPartial: leftNode.type === 'missing' || rightNode.type === 'missing'
        }
      };

      return enforceInheritance(resStep, targetAbnormalityId, neededTraitIds);
    };

    const root = findPath(goal.targetAbnormalityId, goal.desiredTraitIds, 0, new Set());

    const collectMissing = (node: FusionNode) => {
        if (node.type === 'missing') {
            if (!missingElements.find(m => m.name === node.requirement.name && m.type === node.requirement.type && m.purpose === node.requirement.purpose)) {
                missingElements.push(node.requirement);
            }
        } else if (node.type === 'step') {
            collectMissing(node.step.left);
            collectMissing(node.step.right);
            node.step.mids.forEach(collectMissing);
        }
    };
    collectMissing(root);

    setLoading(false);
    return {
      steps: root,
      missingElements,
      isPossible: missingElements.length === 0
    };
  }, []);

  return { solve, loading };
};
