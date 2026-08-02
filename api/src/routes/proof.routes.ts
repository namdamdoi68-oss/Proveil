import { Router, Request, Response } from "express";
import { validateProofRequest } from "../middleware/validate";
import {
  generateAndVerifyProof,
  buildCircuitInputs,
} from "../services/proof.service";
import {
  attestProofOnChain,
  checkVerificationOnChain,
} from "../services/stellar.service";
import { config, ProofType } from "../config";

const router = Router();

// POST /api/prove — generate proof + attest on-chain
router.post(
  "/prove",
  validateProofRequest,
  async (req: Request, res: Response) => {
    const { proofType, walletAddress, data } = req.body;

    try {
      // Build circuit-specific inputs
      const proofInput = buildCircuitInputs(proofType as ProofType, data);

      // Generate and verify proof locally
      const proofResult = await generateAndVerifyProof(proofInput);

      if (!proofResult.success) {
        res.status(400).json({
          success: false,
          error: proofResult.error,
        });
        return;
      }

      // Attest result on Stellar
      const attestResult = await attestProofOnChain(
        walletAddress,
        proofType,
        proofResult.publicSignals!,
      );

      if (!attestResult.success) {
        res.status(500).json({
          success: false,
          error: `on-chain attestation failed: ${attestResult.error}`,
        });
        return;
      }

      res.json({
        success: true,
        proofType,
        walletAddress,
        publicSignals: proofResult.publicSignals,
        txHash: attestResult.txHash,
        message: "Proof verified and attested on Stellar testnet",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// GET /api/verify/:wallet/:proofType — check on-chain verification status
router.get(
  "/verify/:wallet/:proofType",
  async (req: Request, res: Response) => {
    const { wallet, proofType } = req.params as {
      wallet: string;
      proofType: string;
    };

    if (!config.supportedProofTypes.includes(proofType as ProofType)) {
      res.status(400).json({ error: "unsupported proof type" });
      return;
    }

    if (!wallet || !wallet.startsWith("G") || wallet.length !== 56) {
      res.status(400).json({ error: "invalid Stellar walletAddress" });
      return;
    }

    try {
      const isVerified = await checkVerificationOnChain(wallet, proofType);
      res.json({
        wallet,
        proofType,
        verified: isVerified,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET /api/circuits — list all supported circuits and their status
router.get("/circuits", (_req: Request, res: Response) => {
  res.json({
    supported: config.supportedProofTypes,
    count: config.supportedProofTypes.length,
  });
});

// GET /api/health — health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    contractId: config.stellar.contractId,
    network: config.stellar.network,
    timestamp: new Date().toISOString(),
  });
});

export default router;
