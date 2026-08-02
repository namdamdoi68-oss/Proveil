import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  stellar: {
    network: process.env.STELLAR_NETWORK || "testnet",
    rpcUrl:
      process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
    contractId: process.env.CONTRACT_ID || "",
    verifierSecretKey: process.env.VERIFIER_SECRET_KEY || "",
  },
  circuits: {
    buildPath: path.resolve(__dirname, "../../circuits/build"),
  },
  supportedProofTypes: [
    "age_over_18",
    "sanctions_check",
    "accredited_investor",
    "credit_score_range",
    "jurisdiction_check",
    "source_of_funds",
  ] as const,
};

export type ProofType = (typeof config.supportedProofTypes)[number];
