import {
  buildCircuitInputs,
  generateAndVerifyProof,
} from "../src/services/proof.service";
import { ProofType } from "../src/config";
import fs from "fs";

// Mock dependencies
jest.mock("fs");
jest.mock("snarkjs", () => ({
  groth16: {
    fullProve: jest.fn(),
    verify: jest.fn(),
  },
}));

const snarkjs = require("snarkjs");

describe("proof service unit tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  describe("generateAndVerifyProof", () => {
    const validInput = {
      proofType: "age_over_18" as ProofType,
      publicInputs: { currentDate: "123" },
      privateInputs: { birthdate: "20000101" },
    };

    test("returns error if wasm file is missing", async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // wasm missing
      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/^wasm not found: /);
    });

    test("returns error if zkey file is missing", async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // wasm
        .mockReturnValueOnce(false); // zkey
      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/^zkey not found: /);
    });

    test("returns error if vkey file is missing", async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false); // vkey
      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/^vkey not found: /);
    });

    test("returns error if proof generation throws", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      snarkjs.groth16.fullProve.mockRejectedValueOnce(new Error("prove err"));

      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(false);
      expect(res.error).toBe("prove err");
    });

    test("returns error if proof verification fails", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      snarkjs.groth16.fullProve.mockResolvedValueOnce({
        proof: { pi_a: [] },
        publicSignals: ["1"],
      });
      (fs.readFileSync as jest.Mock).mockReturnValueOnce("{}");
      snarkjs.groth16.verify.mockResolvedValueOnce(false);

      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(false);
      expect(res.error).toBe("proof verification failed");
    });

    test("returns success with proof and public signals when verified", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      snarkjs.groth16.fullProve.mockResolvedValueOnce({
        proof: { pi_a: ["1"] },
        publicSignals: ["1"],
      });
      (fs.readFileSync as jest.Mock).mockReturnValueOnce("{}");
      snarkjs.groth16.verify.mockResolvedValueOnce(true);

      const res = await generateAndVerifyProof(validInput);
      expect(res.success).toBe(true);
      expect(res.publicSignals).toEqual(["1"]);
      expect(res.proof).toEqual({ pi_a: ["1"] });
    });
  });
});
