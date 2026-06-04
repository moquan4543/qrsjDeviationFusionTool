# Role & Task
You are the Principal Algorithm Engineer. The solver (`useDeviantSolver.ts`) is still throwing a false-negative "Infinite Recursion" error because its recursive branching logic blindly prioritizes homogeneous matching (Species A + Species A) and treats the 66.7% Multi-Species Proxy Rule as a fallback instead of a primary path. You must rewrite the state branching order.

---

## 1. The Core Logical Flaw
When the solver needs to craft a `Sub-Goal (Species: 遠歸之蝶, Level: 5,5, Trait: 電表倒轉2)`:
1. It looks at the inventory, finds NO matching 5,5 遠歸之蝶 with "電表倒轉2".
2. Instead of checking if **ANOTHER available species** (like the 5,5 Blank 冬靈 in inventory) can act as a dummy parent, it immediately enters a hard-coded recursive loop demanding `Left Parent: 遠歸之蝶` and `Right Parent: 遠歸之蝶`.
3. This creates a circular dependency: To get a 遠歸之蝶, I must craft a 遠歸之蝶, causing the "Infinite Recursion" block to trigger.

---

## 2. Refactoring `useDeviantSolver.ts` Branching Order

To fix this, you must rewrite the parent-pairing generator to evaluate **Cross-Species Proxy Pairs** at the exact same level (or even higher priority) as homogeneous pairs.

When generating potential `(Left, Right, Mid)` combinations to satisfy `Goal(Species: T, Level: 5,5)`:

### Step 1: Generate All Valid Parent Pairs (The Correct Matrix)
Do not hardcode `Left = T` and `Right = T`. Instead, evaluate these two valid configurations against the user's asset pool:

- **Configuration Alpha (Homogeneous):**
    - Left Parent: `Species === T` (Level 5,5)
    - Right Parent: `Species === T` (Level 5,5)
    - Species Success Rate: 100% naturally.

- **Configuration Beta (Cross-Species Proxy - CRITICAL):**
    - Left Parent: `Species === T` (Level 5,5, from inventory or commodity)
    - Right Parent: `Species === D` (Where D is **ANY other species** available in inventory with Level 5,5, such as 冬靈)
    - Mid Slots: **MUST contain at least one fodder of Species T** (to activate the $\frac{2}{3} = 66.7\%$ proxy math).
    - Species Success Rate: 66.7% (Valid 100% deterministic proxy).

### Step 2: Evaluate Both Configurations Side-by-Side
Iterate through BOTH Configuration Alpha and Configuration Beta before making any recursive calls:
1. Flatten the global trait frequency map for the 5-slot setup of both configs (using the multi-trait atomic counter we built earlier).
2. If **Configuration Beta** (Left: 遠歸之蝶, Right: 冬靈, Mid: 0-count 遠歸之蝶, Mid: 0-count 破碎少女) successfully ticks all desired trait boxes to 100% via the atomic counter map, **ACCEPT THIS PATH IMMEDIATELY** and return the tree.
3. **DO NOT** let the algorithm blindly dive into a homogeneous recursive branch if a cross-species configuration can resolve the graph using existing inventory assets in 1 step.

---

## 3. Strict Visited Check
Ensure that if a recursive state `(Species: T, Traits: [...])` is currently being evaluated in the call stack, any sub-step that demands the *exact same* species and trait profile is completely blocked from executing, forcing the solver to move to the next parent pairing option (Configuration Beta).

Please re-architect the parent finder matrix inside `useDeviantSolver.ts` to rank cross-species proxy matching as a first-class citizen alongside same-species matching.