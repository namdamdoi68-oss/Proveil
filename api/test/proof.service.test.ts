import { buildCircuitInputs } from "../src/services/proof.service";
import { ProofType } from "../src/config";

describe("proof service unit tests", () => {
  describe("buildCircuitInputs", () => {
    test("builds inputs for age_over_18", () => {
      const data = { birthdate: "20000101" };
      const result = buildCircuitInputs("age_over_18" as ProofType, data);
      expect(result.proofType).toBe("age_over_18");
      expect(result.privateInputs).toEqual({ birthdate: "20000101" });
      expect(result.publicInputs).toHaveProperty("currentDate");
      expect(typeof result.publicInputs.currentDate).toBe("string");
    });

    test("builds inputs for sanctions_check", () => {
      const data = { identityHash: "123", siblings: ["1", "2"] };
      const result = buildCircuitInputs("sanctions_check" as ProofType, data);
      expect(result.proofType).toBe("sanctions_check");
      expect(result.privateInputs).toEqual({
        identityHash: "123",
        siblings: ["1", "2"],
      });
      expect(result.publicInputs).toEqual({
        merkleRoot: "0",
        pathNumber: "0",
      });
    });

    test("throws error for unhandled proof types", () => {
      const data = { customField: "value" };
      expect(() => {
        buildCircuitInputs("custom_proof" as any, data);
      }).toThrow("unsupported proof type: custom_proof");
    });
  });
});
