# Role & Task
You are the Principal Algorithm Engineer. We found a bug in `useDeviantSolver.ts` related to "Multi-Trait Co-occurrence Counting". The solver fails to evaluate that a single intermediate fodder carrying multiple desired traits satisfies the inheritance frequency (+1 count) for ALL of its traits simultaneously.

---

## 1. Bug Analysis (As seen in 圖片_4.png)
- **The Setup:** User wants `Target(遠歸之蝶 with 星月夜, 電表倒轉2, 月色突襲)`.
- **The Inventory:** - 1x 5,5 遠歸之蝶 (星月夜, 陳舊2) -> Left Parent
  - 1x 5,5 冬靈 (Blank) -> Right Parent Tool
  - 1x 1,1 破碎少女 (電表倒轉2) [Count: 0] -> Mid Slot
  - 1x 1,1 遠歸之蝶 (星月夜, 電表倒轉2) [Count: 0] -> Mid Slot
- **The Bug:** The optimal path should seamlessly accept this because across the 5 slots:
  - "星月夜" appears 2 times (Left Parent + Mid 遠歸之蝶) -> 100% Lock.
  - "電表倒轉2" appears 2 times (Mid 破碎少女 + Mid 遠歸之蝶) -> 100% Lock.
  - Species "遠歸之蝶" achieves 66.7% via Proxy Rule (Left Parent + Mid 遠歸之蝶).
- **Why it failed:** The solver's frequency scanner incorrectly isolated items. When evaluating "星月夜", it locked the 0-count 遠歸之蝶. But when evaluating "電表倒轉2", it failed to read that the *exact same* 0-count 遠歸之蝶 also increments the counter for "電表倒轉2". Thus it threw a false missing block for BOTH traits.

---

## 2. Refactoring `useDeviantSolver.ts` Step-Validation Loop

Please rewrite the trait frequency scanning function inside the solver to ensure **Atomic Multi-Trait Evaluation**:

1. **Simultaneous 5-Slot Expansion:**
   - Before verifying trait inheritance percentages, the solver must fully flatten the selected 5 items (`Left`, `Right`, `Mid1`, `Mid2`, `Mid3`) into a combined state.
   - Run a single, unified loop across all 5 slots to build the global frequency map:
     ```typescript
     const traitFrequency = new Map<string, number>();
     const categoryFrequency = new Map<string, number>();

     // Iterate through all 5 assigned items for the current combination step
     chosenSlots.forEach(item => {
       if (!item) return;
       item.traits.forEach(traitId => {
         // CRITICAL: An item increments the counter for ALL of its traits at once
         traitFrequency.set(traitId, (traitFrequency.get(traitId) || 0) + 1);
         
         const traitMeta = traitsData.find(t => t.id === traitId);
         if (traitMeta) {
           categoryFrequency.set(traitMeta.category, (categoryFrequency.get(traitMeta.category) || 0) + 1);
         }
       });
     });
     ```

2. **Validation Against Global Map:**
   - Once the unified `traitFrequency` map is populated for the step, evaluate the desired goal traits against it.
   - In the user's scenario, `traitFrequency.get('電表倒轉2')` will successfully return `2`, and `traitFrequency.get('星月夜')` will return `2`.
   - Ensure the solver validates this step as 100% deterministic and correctly binds the 5,5 Winter Fairy (冬靈) as the `Right Parent` dummy, since the species weight math ($\text{遠歸之蝶} = 2$, $\text{冬靈} = 1 \rightarrow 2/3 = 66.7\%$) safely resolves to 100% proxy success.

3. **Prune Unwanted Pollution Dynamically:**
   - Note that the Left Parent also carries "陳舊2". Since it only appears 1 time and has no category competitor, it has a 50% chance to leak. 
   - However, because "陳舊2" is an **Abnormal (非正常)** category trait, and the target script doesn't demand it, ensure the solver handles it (either flags a warning or suppresses it if a target trait can wipe it out, but do not let it throw a hard "missing element" error for desired traits).

---

Please refactor the frequency map generator to look at items atomically rather than per-trait iteratively. This will fix the false-negative error flags for composite items.