import { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function validateProofRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { proofType, walletAddress, data } = req.body;

  if (!proofType) {
    res.status(400).json({ error: "proofType is required" });
    return;
  }

  if (!config.supportedProofTypes.includes(proofType)) {
    res.status(400).json({
      error: `unsupported proofType. Must be one of: ${config.supportedProofTypes.join(", ")}`,
    });
    return;
  }

  if (!walletAddress) {
    res.status(400).json({ error: "walletAddress is required" });
    return;
  }

  if (!walletAddress.startsWith("G") || walletAddress.length !== 56) {
    res.status(400).json({ error: "invalid Stellar walletAddress" });
    return;
  }

  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "data object is required" });
    return;
  }

  next();
}
