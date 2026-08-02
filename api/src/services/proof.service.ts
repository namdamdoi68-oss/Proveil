import path from "path";
import fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const snarkjs = require("snarkjs");
import { config, ProofType } from "../config";

export interface ProofInput {
  proofType: ProofType;
  privateInputs: Record<string, string | number | string[]>;
  publicInputs: Record<string, string | number>;
}

export interface ProofResult {
  success: boolean;
  proof?: any;
  publicSignals?: string[];
  error?: string;
}

export async function generateAndVerifyProof(
  input: ProofInput,
): Promise<ProofResult> {
  try {
    const circuitDir = path.join(config.circuits.buildPath, input.proofType);
    const wasmPath = path.join(
      circuitDir,
      input.proofType + "_js",
      input.proofType + ".wasm",
    );
    const zkeyPath = path.join(circuitDir, input.proofType + "_final.zkey");
    const vkeyPath = path.join(circuitDir, "verification_key.json");

    // Verify circuit files exist
    if (!fs.existsSync(wasmPath)) {
      return { success: false, error: `wasm not found: ${wasmPath}` };
    }
    if (!fs.existsSync(zkeyPath)) {
      return { success: false, error: `zkey not found: ${zkeyPath}` };
    }
    if (!fs.existsSync(vkeyPath)) {
      return { success: false, error: `vkey not found: ${vkeyPath}` };
    }

    // Merge all inputs for witness generation
    const circuitInputs = {
      ...input.privateInputs,
      ...input.publicInputs,
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInputs,
      wasmPath,
      zkeyPath,
    );

    // Verify proof locally
    const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    if (!isValid) {
      return { success: false, error: "proof verification failed" };
    }

    return {
      success: true,
      proof,
      publicSignals,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Build circuit inputs for each proof type
export function buildCircuitInputs(
  proofType: ProofType,
  data: Record<string, any>,
): ProofInput {
  const now = Math.floor(Date.now() / 1000);

  switch (proofType) {
    case "age_over_18":
      return {
        proofType,
        privateInputs: { birthdate: String(data.birthdate) },
        publicInputs: { currentDate: String(now) },
      };

    case "accredited_investor":
      return {
        proofType,
        privateInputs: { netWorth: String(data.netWorth) },
        publicInputs: { threshold: String(data.threshold || "100000000") },
      };

    case "credit_score_range":
      return {
        proofType,
        privateInputs: { creditScore: String(data.creditScore) },
        publicInputs: { minimumScore: String(data.minimumScore || "650") },
      };

    case "jurisdiction_check":
      return {
        proofType,
        privateInputs: { countryCode: String(data.countryCode) },
        publicInputs: { allowedCountryCode: String(data.allowedCountryCode) },
      };

    case "source_of_funds":
      return {
        proofType,
        privateInputs: {
          transactionHistoryHash: String(data.transactionHistoryHash),
          salt: String(data.salt || Math.floor(Math.random() * 1e15)),
        },
        publicInputs: {
          compliancePolicyHash: String(data.compliancePolicyHash),
        },
      };

    case "sanctions_check":
      return {
        proofType,
        privateInputs: {
          identityHash: String(data.identityHash),
          siblings: data.siblings || Array(10).fill("0"),
        },
        publicInputs: {
          merkleRoot: String(data.merkleRoot || "0"),
          pathNumber: String(data.pathNumber || "0"),
        },
      };

    default:
      throw new Error(`unsupported proof type: ${proofType}`);
  }
}
