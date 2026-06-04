import { expect, test, describe } from "bun:test";
import { calculateFusionPath } from "../src/lib/solver";
import inventory1 from "./mocks/inventory_1.json";
import inventory2 from "./mocks/inventory_2.json";

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

  test("Scenario 3: Impossible Path (Missing Traits)", () => {
    const goal = {
      targetAbnormalityId: "A042",
      desiredTraitIds: ["T999"] // Non-existent trait
    };

    const result = calculateFusionPath(inventory1 as any, goal);

    expect(result.isPossible).toBe(false);
    expect(result.missingElements.length).toBeGreaterThan(0);
    expect(result.missingElements[0].type).toBe("trait");
  });

});
