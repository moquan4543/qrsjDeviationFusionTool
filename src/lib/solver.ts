import { Abnormality, Trait, UserInventoryDeviant, GoalConfiguration, MissingRequirement, SolverResult, FusionNode, FusionStep } from '@/types';
import { getAbnormalities, getTraits } from './data';

export function calculateFusionPath(
  inventory: UserInventoryDeviant[],
  goal: GoalConfiguration
): SolverResult {
  const abnormalities = getAbnormalities();
  const allTraits = getTraits();
  
  // Each entry is a unique instance
  const initialCounts = new Map<string, number>();
  inventory.forEach(item => initialCounts.set(item.id, 1));

  const checkStepSafety = (
      targetAbnormalityId: string,
      targetTraits: string[],
      left: FusionNode,
      right: FusionNode,
      mids: FusionNode[]
  ) => {
      const traitFreq = new Map<string, number>();
      const categoryFreq = new Map<string, number>();
      
      const getSpecies = (node: FusionNode) => {
          if (node.type === 'inventory') return node.abnormalityId;
          if (node.type === 'step') return node.step.target.abnormalityId;
          return null;
      };
      const leftSpecies = getSpecies(left);
      const rightSpecies = getSpecies(right);
      
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
              multiplier = 2;
          }

          if (nodeSpecies) {
              if (nodeSpecies === targetAbnormalityId) {
                  targetSpeciesPoints += 1;
              } else if (nodeSpecies === rightSpecies || nodeSpecies === leftSpecies) {
                  otherParentSpeciesPoints += 1;
              }
          }

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

  const evaluateStepConfig = (
      targetAbnormalityId: string,
      targetTraits: string[],
      left: FusionNode,
      right: FusionNode,
      currentCounts: Map<string, number>
  ): { mids: FusionNode[], safety: any, consumedIds: string[] } => {
      const mandatoryMids: FusionNode[] = [];
      targetTraits.forEach(tid => {
          const trait = allTraits.find(t => t.id === tid);
          if (trait?.category === '變異') {
              const materialName = trait.description.match(/【(.*?)】/) ? trait.description.match(/【(.*?)】/)![1] : "指定變異材料";
              mandatoryMids.push({ type: 'mutation_material', traitId: tid, traitName: trait.name, materialName: materialName });
          }
      });

      const remainingSlots = Math.max(0, 3 - mandatoryMids.length);
      const candidatePool = inventory.filter(item => 
          (currentCounts.get(item.id) || 0) > 0 &&
          (item.abnormalityId === targetAbnormalityId || targetTraits.some(tt => item.traits.includes(tt)))
      );

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
      let bestResult: { mids: FusionNode[], safety: any, consumedIds: string[] } | null = null;
      let foundSafe = false;

      for (let count = 0; count <= remainingSlots; count++) {
          const combos = getCombinations(limitedPool, count);
          for (const combo of combos) {
              const currentMids: FusionNode[] = [
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
              
              const safety = checkStepSafety(targetAbnormalityId, targetTraits, left, right, currentMids);
              const consumedIds = combo.map(i => i.id);

              if (safety.isSafe) {
                  bestResult = { mids: currentMids, safety, consumedIds };
                  foundSafe = true;
                  break;
              }
              
              if (!bestResult || 
                  safety.missingTraits.length < bestResult.safety.missingTraits.length ||
                  (safety.missingTraits.length === bestResult.safety.missingTraits.length && safety.isSpeciesSafe && !bestResult.safety.isSpeciesSafe)) {
                  bestResult = { mids: currentMids, safety, consumedIds };
              }
          }
          if (foundSafe) break;
      }

      if (bestResult && !bestResult.safety.isSafe) {
          const midsWithMissing = [...bestResult.mids];
          bestResult.safety.missingTraits.forEach((tid: string) => {
              const trait = allTraits.find(t => t.id === tid);
              midsWithMissing.push({ type: 'missing', requirement: { type: 'trait', name: trait?.name || tid, purpose: `繼承機率未達 100%` } });
          });
          if (!bestResult.safety.isSpeciesSafe) {
              const abName = abnormalities.find(a => a.id === targetAbnormalityId)?.name || targetAbnormalityId;
              midsWithMissing.push({ type: 'missing', requirement: { type: 'species', name: abName, purpose: `物種權重不足` } });
          }
          return { ...bestResult, mids: midsWithMissing };
      }

      return bestResult || { mids: [], safety: { isSafe: false, missingTraits: targetTraits, isSpeciesSafe: false }, consumedIds: [] };
  };

  const compareResults = (
      a: { node: FusionNode, updatedCounts: Map<string, number>, safety: any } | null, 
      b: { node: FusionNode, updatedCounts: Map<string, number>, safety: any }
  ) => {
      if (!a) return b;
      if (b.node.type === 'missing') return a;
      if (a.safety.isSafe && !b.safety.isSafe) return a;
      if (!a.safety.isSafe && b.safety.isSafe) return b;
      if (a.safety.missingTraits.length !== b.safety.missingTraits.length) {
          return a.safety.missingTraits.length < b.safety.missingTraits.length ? a : b;
      }
      if (a.safety.isSpeciesSafe && !b.safety.isSpeciesSafe) return a;
      if (!a.safety.isSpeciesSafe && b.safety.isSpeciesSafe) return b;
      return a;
  };

  const findPath = (
      targetAbnormalityId: string, 
      neededTraitIds: string[], 
      currentCounts: Map<string, number>,
      depth: number = 0, 
      visited: Set<string> = new Set()
  ): { node: FusionNode, updatedCounts: Map<string, number>, safety: any } => {
    const targetAb = abnormalities.find(a => a.id === targetAbnormalityId);
    const abName = targetAb?.name || targetAbnormalityId;

    const returnMissing = (purpose: string) => ({
        node: { type: 'missing' as const, requirement: { type: 'species' as const, name: abName, purpose } },
        updatedCounts: currentCounts,
        safety: { isSafe: false, missingTraits: neededTraitIds, isSpeciesSafe: false }
    });

    if (depth > 8) return returnMissing("超過最大遞迴深度");
    const sortedTraits = [...neededTraitIds].sort();
    const currentPathKey = `${targetAbnormalityId}:${sortedTraits.join(',')}`;
    if (visited.has(currentPathKey)) return returnMissing("檢測到無限遞迴");
    
    const newVisited = new Set(visited);
    newVisited.add(currentPathKey);

    // 1. Exact Match Check
    const exactMatch = inventory.find(item => 
        item.abnormalityId === targetAbnormalityId && 
        item.ability === 5 && item.activity === 5 &&
        neededTraitIds.every(nt => item.traits.includes(nt)) &&
        (currentCounts.get(item.id) || 0) > 0
    );
    if (exactMatch) {
        const nextCounts = new Map(currentCounts);
        nextCounts.set(exactMatch.id, (nextCounts.get(exactMatch.id) || 1) - 1);
        return { 
            node: { type: 'inventory', id: exactMatch.id, abnormalityId: exactMatch.abnormalityId, traitIds: exactMatch.traits, ability: exactMatch.ability, activity: exactMatch.activity }, 
            updatedCounts: nextCounts,
            safety: { isSafe: true, missingTraits: [], isSpeciesSafe: true }
        };
    }

    // Identify potential 5,5 parents
    const p1Candidates = inventory.filter(item => 
        item.abnormalityId === targetAbnormalityId && item.ability === 5 && item.activity === 5 && (currentCounts.get(item.id) || 0) > 0
    );
    const all55 = inventory.filter(item => item.ability === 5 && item.activity === 5 && (currentCounts.get(item.id) || 0) > 0);

    let bestOverall: { node: FusionNode, updatedCounts: Map<string, number>, safety: any } | null = null;

    // 2. Inventory-First Strategy (Try all distinct dummy species)
    if (p1Candidates.length > 0) {
        const p1 = p1Candidates[0];
        const p2Candidates = all55.filter(i => i.id !== p1.id);
        const p2Groups = new Map<string, UserInventoryDeviant>();
        p2Candidates.forEach(c => { if (!p2Groups.has(c.abnormalityId)) p2Groups.set(c.abnormalityId, c); });

        for (const p2 of p2Groups.values()) {
            const tempCounts = new Map(currentCounts);
            tempCounts.set(p1.id, (tempCounts.get(p1.id) || 1) - 1);
            tempCounts.set(p2.id, (tempCounts.get(p2.id) || 1) - 1);

            const left: FusionNode = { type: 'inventory', id: p1.id, abnormalityId: p1.abnormalityId, traitIds: p1.traits, ability: p1.ability, activity: p1.activity };
            const right: FusionNode = { type: 'inventory', id: p2.id, abnormalityId: p2.abnormalityId, traitIds: p2.traits, ability: p2.ability, activity: p2.activity };

            const config = evaluateStepConfig(targetAbnormalityId, neededTraitIds, left, right, tempCounts);
            const node: FusionNode = { type: 'step', step: { target: { abnormalityId: targetAbnormalityId, traitIds: neededTraitIds, ability: 5, activity: 5 }, left, right, mids: config.mids, isPartial: !config.safety.isSafe } };

            const res = { node, updatedCounts: tempCounts, safety: config.safety };
            config.consumedIds.forEach(id => res.updatedCounts.set(id, (res.updatedCounts.get(id) || 1) - 1));

            if (res.safety.isSafe) return res;
            bestOverall = compareResults(bestOverall, res);
        }
    } else {
        // Scenario 4: Upgrade Suggestion (5,4 + 4,5)
        const p54 = inventory.find(i => i.abnormalityId === targetAbnormalityId && i.ability === 5 && i.activity === 4 && (currentCounts.get(i.id) || 0) > 0);
        const p45 = inventory.find(i => i.abnormalityId === targetAbnormalityId && i.ability === 4 && i.activity === 5 && (currentCounts.get(i.id) || 0) > 0);

        if (p54 && p45) {
            const tempCounts = new Map(currentCounts);
            tempCounts.set(p54.id, (tempCounts.get(p54.id) || 1) - 1);
            tempCounts.set(p45.id, (tempCounts.get(p45.id) || 1) - 1);

            const left: FusionNode = { type: 'inventory', id: p54.id, abnormalityId: p54.abnormalityId, traitIds: p54.traits, ability: p54.ability, activity: p54.activity };
            const right: FusionNode = { type: 'inventory', id: p45.id, abnormalityId: p45.abnormalityId, traitIds: p45.traits, ability: p45.ability, activity: p45.activity };

            // For upgrade, we check if it can maintain the needed traits. 
            // We only consider traits that these parents actually carry and are needed.
            const traitsInUpgrade = neededTraitIds.filter(tid => p54.traits.includes(tid) || p45.traits.includes(tid));
            const config = evaluateStepConfig(targetAbnormalityId, traitsInUpgrade, left, right, tempCounts);

            // Only suggest if the upgrade itself is safe for the traits it carries
            if (config.safety.isSafe) {
                const node: FusionNode = { 
                    type: 'upgrade_suggestion', 
                    step: { 
                        target: { abnormalityId: targetAbnormalityId, traitIds: traitsInUpgrade, ability: 5, activity: 5 }, 
                        left, 
                        right, 
                        mids: config.mids 
                    },
                    probabilityNote: "⚠️ 提示：此路徑為「機率性升級」，合成結果有機會從 5,4 + 4,5 提升為 5,5，但並非 100% 成功。"
                };
                const res = { node, updatedCounts: tempCounts, safety: config.safety };
                config.consumedIds.forEach(id => res.updatedCounts.set(id, (res.updatedCounts.get(id) || 1) - 1));

                // Return this as a high-priority "almost there" result
                return res;
            }
        }
    }
    // 3. Recursive Fallback (Try all distinct dummy species for p2)
    const leftTraits = neededTraitIds.slice(0, Math.ceil(neededTraitIds.length / 2));
    const rightTraits = neededTraitIds.slice(Math.ceil(neededTraitIds.length / 2));

    const { node: leftNode, updatedCounts: afterLeftCounts } = findPath(targetAbnormalityId, leftTraits, currentCounts, depth + 1, newVisited);
    
    const p2CandidatesRec = inventory.filter(item => item.ability === 5 && item.activity === 5 && (afterLeftCounts.get(item.id) || 0) > 0);
    const p2GroupsRec = new Map<string, UserInventoryDeviant>();
    p2CandidatesRec.forEach(c => { if (!p2GroupsRec.has(c.abnormalityId)) p2GroupsRec.set(c.abnormalityId, c); });

    for (const p2 of p2GroupsRec.values()) {
        const tempCounts = new Map(afterLeftCounts);
        tempCounts.set(p2.id, (tempCounts.get(p2.id) || 1) - 1);
        const rightNode: FusionNode = { type: 'inventory', id: p2.id, abnormalityId: p2.abnormalityId, traitIds: p2.traits, ability: 5, activity: 5 };
        const config = evaluateStepConfig(targetAbnormalityId, neededTraitIds, leftNode, rightNode, tempCounts);
        const node: FusionNode = { type: 'step', step: { target: { abnormalityId: targetAbnormalityId, traitIds: neededTraitIds, ability: 5, activity: 5 }, left: leftNode, right: rightNode, mids: config.mids, isPartial: !config.safety.isSafe || leftNode.type === 'missing' } };
        const res = { node, updatedCounts: tempCounts, safety: config.safety };
        config.consumedIds.forEach(id => res.updatedCounts.set(id, (res.updatedCounts.get(id) || 1) - 1));
        
        if (res.safety.isSafe && leftNode.type !== 'missing') return res;
        bestOverall = compareResults(bestOverall, res);
    }

    // Double Recursion (Absolute Fallback)
    const { node: rightNodeRec, updatedCounts: afterBothCounts } = findPath(targetAbnormalityId, rightTraits, afterLeftCounts, depth + 1, newVisited);
    const configFinal = evaluateStepConfig(targetAbnormalityId, neededTraitIds, leftNode, rightNodeRec, afterBothCounts);
    const finalNode: FusionNode = { type: 'step', step: { target: { abnormalityId: targetAbnormalityId, traitIds: neededTraitIds, ability: 5, activity: 5 }, left: leftNode, right: rightNodeRec, mids: configFinal.mids, isPartial: !configFinal.safety.isSafe || leftNode.type === 'missing' || rightNodeRec.type === 'missing' } };
    const finalRes = { node: finalNode, updatedCounts: afterBothCounts, safety: configFinal.safety };
    configFinal.consumedIds.forEach(id => finalRes.updatedCounts.set(id, (finalRes.updatedCounts.get(id) || 1) - 1));
    
    return compareResults(bestOverall, finalRes);
  };

  const { node: root } = findPath(goal.targetAbnormalityId, goal.desiredTraitIds, initialCounts, 0, new Set());

  const missingElements: MissingRequirement[] = [];
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

  return {
    steps: root,
    missingElements,
    isPossible: missingElements.length === 0
  };
}
