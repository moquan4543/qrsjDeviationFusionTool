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

    const getTraitCategory = (tid: string): TraitCategory => 
        allTraits.find(t => t.id === tid)?.category || '通用';

    const checkStepSafety = (
        targetAbnormalityId: string,
        targetTraits: string[],
        left: FusionNode,
        right: FusionNode,
        mids: FusionNode[]
    ) => {
        const traitFreq = new Map<string, number>();
        const categoryFreq = new Map<string, number>();
        const speciesFreq = new Map<string, number>();
        let totalSpeciesWeight = 0;

        // Flatten all 5 slots into a single evaluation pool (Fix 6 Atomic Evaluation)
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
                speciesFreq.set(nodeSpecies, (speciesFreq.get(nodeSpecies) || 0) + 1);
                totalSpeciesWeight += 1;
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
            
            // 100% inheritance requires freq >= 2 and share >= 66.7%
            if (freq < 2 || (freq / total < 0.666)) {
                missingTraits.push(tid);
            }
        });

        const speciesShare = totalSpeciesWeight > 0 ? (speciesFreq.get(targetAbnormalityId) || 0) / totalSpeciesWeight : 0;
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
        const traitsHandledAsMissing = new Set<string>();
        let speciesHandledAsMissing = false;
        
        while (true) {
            const safety = checkStepSafety(targetAbnormalityId, targetTraits, step.left, step.right, step.mids);
            const trueMissingTraits = safety.missingTraits.filter(t => !traitsHandledAsMissing.has(t));
            
            if (trueMissingTraits.length === 0 && safety.isSpeciesSafe) break;

            let addedSomething = false;

            // 1. Try to fix missing traits
            if (trueMissingTraits.length > 0) {
                for (const tid of trueMissingTraits) {
                    const trait = allTraits.find(t => t.id === tid);
                    if (trait?.category === '變異') {
                        const materialName = trait.description.match(/【(.*?)】/) ? trait.description.match(/【(.*?)】/)![1] : "指定變異材料";
                        step.mids.push({
                            type: 'mutation_material',
                            traitId: tid,
                            traitName: trait.name,
                            materialName: materialName
                        });
                        addedSomething = true;
                        break;
                    } else if (step.mids.length < 3) {
                        // Find a carrier, prioritizing the target species to help species weight
                        let carrier = inventory.find(item => 
                            item.traits.includes(tid) && 
                            item.abnormalityId === targetAbnormalityId &&
                            isAvailable(item)
                        );
                        if (!carrier) {
                            carrier = inventory.find(item => 
                                item.traits.includes(tid) && 
                                isAvailable(item)
                            );
                        }

                        if (carrier) {
                            step.mids.push({
                                type: 'inventory',
                                id: carrier.id,
                                abnormalityId: carrier.abnormalityId,
                                traitIds: carrier.traits,
                                ability: carrier.ability,
                                activity: carrier.activity
                            });
                            consumeItem(carrier);
                            addedSomething = true;
                            break;
                        } else {
                            step.isPartial = true;
                            traitsHandledAsMissing.add(tid);
                            const traitName = trait?.name || tid;
                            step.mids.push({
                                type: 'missing',
                                requirement: {
                                    type: 'trait',
                                    name: traitName,
                                    purpose: `缺少 1 個【${traitName}】詞條。需要額外放入一隻帶有此詞條的異常物以達到 100% 繼承。`
                                }
                            });
                            addedSomething = true;
                            break;
                        }
                    }
                }
            }

            // 2. Try to fix missing species
            if (!addedSomething && !safety.isSpeciesSafe && step.mids.length < 3 && !speciesHandledAsMissing) {
                const fodder = inventory.find(item => 
                    item.abnormalityId === targetAbnormalityId && 
                    isAvailable(item)
                );
                if (fodder) {
                    step.mids.push({
                        type: 'inventory',
                        id: fodder.id,
                        abnormalityId: fodder.abnormalityId,
                        traitIds: fodder.traits,
                        ability: fodder.ability,
                        activity: fodder.activity
                    });
                    consumeItem(fodder);
                    addedSomething = true;
                } else {
                    step.isPartial = true;
                    speciesHandledAsMissing = true;
                    const abName = abnormalities.find(a => a.id === targetAbnormalityId)?.name || targetAbnormalityId;
                    step.mids.push({
                        type: 'missing',
                        requirement: {
                            type: 'species',
                            name: abName,
                            purpose: `物種權重不足 (需 >= 66.7%)，需要放入同種物種的墊子。`
                        }
                    });
                    addedSomething = true;
                }
            }

            if (!addedSomething || step.mids.length >= 3) break;
        }
        return node;
    };

    /**
     * findPath searches for a way to create targetAbnormalityId with neededTraitIds and 5,5 rating.
     */
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

      // 1. Exact Match Check (Inventory) - Priority 1
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

      // 2. Multi-Species Proxy Rule & Inventory-First Strategy (Fix 7) - Priority 2
      // Try Config Alpha (T+T) or Config Beta (T+D) using existing inventory 5,5 assets.
      const p1 = find55Parent(targetAbnormalityId);
      if (p1) {
          // Seek another 5,5 parent. prioritize same-species (Alpha), then any other (Beta).
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
              
              // Let enforceInheritance handle mid-slot injection for traits and species weight
              return enforceInheritance({ type: 'step', step }, targetAbnormalityId, neededTraitIds);
          }
      }

      // 3. Recursive Fallback (If no inventory 5,5 parents are available)
      const leftTraits = neededTraitIds.slice(0, Math.ceil(neededTraitIds.length / 2));
      const rightTraits = neededTraitIds.slice(Math.ceil(neededTraitIds.length / 2));

      // Craft P1 (Always target species T)
      const leftNode = findPath(targetAbnormalityId, leftTraits, depth + 1, newVisited);
      
      // For P2, check if we can use an inventory 5,5 dummy to avoid double recursion (Config Beta optimization)
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

    // Collect missing elements
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
