import request from "supertest";
import app from "../src/index";
import * as proofService from "../src/services/proof.service";
import * as stellarService from "../src/services/stellar.service";

jest.mock("../src/services/proof.service", () => ({
  ...jest.requireActual("../src/services/proof.service"),
  generateAndVerifyProof: jest.fn(),
}));

jest.mock("../src/services/stellar.service", () => ({
  attestProofOnChain: jest.fn(),
  checkVerificationOnChain: jest.fn(),
}));

describe("API Route Integration Tests", () => {
  const validWallet =
    "GB7B2Y4C3XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34";

  describe("GET /api/health", () => {
    test("returns health status ok", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("contractId");
      expect(res.body).toHaveProperty("network");
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /api/circuits", () => {
    test("returns list of supported circuits", async () => {
      const res = await request(app).get("/api/circuits");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("supported");
      expect(Array.isArray(res.body.supported)).toBe(true);
      expect(res.body).toHaveProperty("count");
    });
  });

  describe("GET /api/verify/:wallet/:proofType", () => {
    test("returns 400 for unsupported proof type", async () => {
      const res = await request(app).get(
        `/api/verify/${validWallet}/invalid_proof_type`,
      );
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "unsupported proof type" });
    });

    test("returns verification status when verified on-chain", async () => {
      (stellarService.checkVerificationOnChain as jest.Mock).mockResolvedValue(
        true,
      );

      const res = await request(app).get(
        `/api/verify/${validWallet}/age_over_18`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        wallet: validWallet,
        proofType: "age_over_18",
        verified: true,
      });
    });

    test("returns 500 when checkVerificationOnChain throws error", async () => {
      (stellarService.checkVerificationOnChain as jest.Mock).mockRejectedValue(
        new Error("RPC connection failed"),
      );

      const res = await request(app).get(
        `/api/verify/${validWallet}/age_over_18`,
      );
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "RPC connection failed" });
    });
  });

  describe("POST /api/prove", () => {
    test("returns 400 when validation middleware fails", async () => {
      const res = await request(app).post("/api/prove").send({
        proofType: "age_over_18",
        walletAddress: "INVALID_WALLET",
      });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("returns 400 when proof generation fails", async () => {
      (proofService.generateAndVerifyProof as jest.Mock).mockResolvedValue({
        success: false,
        error: "Circuit constraint not satisfied",
      });

      const res = await request(app)
        .post("/api/prove")
        .send({
          proofType: "age_over_18",
          walletAddress: validWallet,
          data: { age: 15, minAge: 18 },
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: "Circuit constraint not satisfied",
      });
    });

    test("returns 500 when on-chain attestation fails", async () => {
      (proofService.generateAndVerifyProof as jest.Mock).mockResolvedValue({
        success: true,
        publicSignals: ["1"],
        proof: {},
      });
      (stellarService.attestProofOnChain as jest.Mock).mockResolvedValue({
        success: false,
        error: "Transaction failed",
      });

      const res = await request(app)
        .post("/api/prove")
        .send({
          proofType: "age_over_18",
          walletAddress: validWallet,
          data: { age: 21, minAge: 18 },
        });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: "on-chain attestation failed: Transaction failed",
      });
    });

    test("returns 200 on successful proof generation and attestation", async () => {
      (proofService.generateAndVerifyProof as jest.Mock).mockResolvedValue({
        success: true,
        publicSignals: ["1"],
        proof: { pi_a: [] },
      });
      (stellarService.attestProofOnChain as jest.Mock).mockResolvedValue({
        success: true,
        txHash: "0xabc123hash",
      });

      const res = await request(app)
        .post("/api/prove")
        .send({
          proofType: "age_over_18",
          walletAddress: validWallet,
          data: { age: 21, minAge: 18 },
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        proofType: "age_over_18",
        walletAddress: validWallet,
        publicSignals: ["1"],
        txHash: "0xabc123hash",
        message: "Proof verified and attested on Stellar testnet",
      });
    });
  });

  describe("404 Handler", () => {
    test("returns 404 for non-existent endpoint", async () => {
      const res = await request(app).get("/api/non_existent_route");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "not found" });
    });
  });
});
