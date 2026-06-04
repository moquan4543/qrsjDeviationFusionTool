import { expect, test, describe } from "bun:test";
import { calculateFusionPath } from "../src/lib/solver";
import inventory1 from "./mocks/inventory_1.json";
import inventory2 from "./mocks/inventory_2.json";
import inventory3 from "./mocks/inventory_3.json";

describe("Fusion Solver Logic", () => {
  
  test("Scenario 1: Cross-Species Proxy Rule (Faraway Butterfly)", () => {
    const goal = {
      targetAbnormalityId: "A042", // 遠歸之蝶
      desiredTraitIds: ["T015", "T232", "T260"] // 星月夜, 電表倒轉2, 月色突襲
    };

    const result = calculateFusionPath(inventory1 as any, goal);

    expect(result.isPossible).toBe(true);
    expect(result.missingElements).toHaveLength(0);
    
    // Verify specific structure if needed
    const root = result.steps;
    expect(root.type).toBe("step");
    expect(root.step.target.abnormalityId).toBe("A042");
  });

  test("Scenario 2: Colliding Dummy Species Conflict (Stinky Bulb)", () => {
    const goal = {
      targetAbnormalityId: "A017", // 惡臭球根
      desiredTraitIds: ["T232"] // 電表倒轉2
    };

    const result = calculateFusionPath(inventory2 as any, goal);

    expect(result.isPossible).toBe(true);
    expect(result.missingElements).toHaveLength(0);
    
    const root = result.steps;
    expect(root.type).toBe("step");
    expect(root.step.target.abnormalityId).toBe("A017");
    
    // Ensure 2/3 weight is met
    // (In this scenario, it should pick a non-colliding dummy to avoid A042 conflict if necessary)
  });

  test("Scenario 4: Upgrade Suggestion (Missing 5,5 Butterfly)", () => {
    const goal = {
      targetAbnormalityId: "A042", // 遠歸之蝶
      desiredTraitIds: ["T015", "T232", "T260"] // 星月夜, 電表倒轉2, 月色突襲
    };

    // inventory_3 has 5,4 and 4,5 A042, but NO 5,5 A042.
    // However, it has 5,5 A006 (Proxy).
    // Config Beta requires a 5,5 target species as Left Parent.
    // So it should suggest upgrading A042 first.
    const result = calculateFusionPath(inventory3 as any, goal);

    // It is possible via upgrade suggestion
    expect(result.isPossible).toBe(true);
    expect(result.steps.type).toBe("upgrade_suggestion");
    expect(result.steps.step.target.ability).toBe(5);
    expect(result.steps.step.target.activity).toBe(5);
  });
});
