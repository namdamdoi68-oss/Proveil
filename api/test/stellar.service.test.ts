import {
  attestProofOnChain,
  checkVerificationOnChain,
} from "../src/services/stellar.service";
import * as StellarSdk from "@stellar/stellar-sdk";

// Mock config
jest.mock("../src/config", () => ({
  config: {
    stellar: {
      rpcUrl: "http://mock-rpc",
      contractId: "C123",
      network: "Test SDF Network ; September 2015",
      verifierSecretKey:
        "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    },
  },
}));

// Setup mocks
jest.mock("@stellar/stellar-sdk", () => {
  const mockServer = {
    getAccount: jest.fn(),
    prepareTransaction: jest.fn(),
    sendTransaction: jest.fn(),
    getTransaction: jest.fn(),
    simulateTransaction: jest.fn(),
  };

  const mockContract = {
    call: jest.fn(),
  };

  const mockTxBuilder = {
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn(),
  };

  return {
    rpc: {
      Server: jest.fn(() => mockServer),
      Api: {
        isSimulationSuccess: jest.fn((res) => res.isSuccess === true),
      },
    },
    Contract: jest.fn(() => mockContract),
    TransactionBuilder: jest.fn(() => mockTxBuilder),
    Keypair: {
      fromSecret: jest.fn(() => ({
        publicKey: () =>
          "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      })),
    },
    Address: jest.fn(() => ({
      toScVal: jest.fn(),
    })),
    nativeToScVal: jest.fn(() => "mockScVal"),
    xdr: {
      ScVal: {
        scvVec: jest.fn(),
        scvMap: jest.fn(),
        scvSymbol: jest.fn(),
      },
      ScMapEntry: jest.fn(),
    },
    Networks: {
      TESTNET: "Test SDF Network ; September 2015",
    },
    BASE_FEE: "100",
    scValToNative: jest.fn((val) => val === "mockScValTrue"),
  };
});

describe("stellar service unit tests", () => {
  const validWallet =
    "GB7B2Y4C3XNBLV3W2G34PEX35A43W64EXY34M5P34P34P34P34P34P34";
  
  let mockServer: any;
  let mockTxBuilder: any;
  let mockPreparedTx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // get instance of mock Server
    const serverInstance = new StellarSdk.rpc.Server("url");
    mockServer = serverInstance;

    const txBuilderInstance = new StellarSdk.TransactionBuilder({} as any, {} as any);
    mockTxBuilder = txBuilderInstance;

    mockPreparedTx = {
      sign: jest.fn(),
    };

    mockServer.prepareTransaction.mockResolvedValue(mockPreparedTx);
    mockTxBuilder.build.mockReturnValue({ tx: "mockTx" });
  });

  describe("attestProofOnChain", () => {
    test("returns error if sendTransaction fails", async () => {
      mockServer.sendTransaction.mockResolvedValue({
        status: "ERROR",
        errorResult: { toXDR: () => "error_xdr" },
      });

      const res = await attestProofOnChain(validWallet, "age_over_18", ["1"]);
      expect(res.success).toBe(false);
      expect(res.error).toBe("error_xdr");
    });

    test("returns success when tx confirms", async () => {
      mockServer.sendTransaction.mockResolvedValue({
        status: "PENDING",
        hash: "0xhash",
      });
      mockServer.getTransaction.mockResolvedValue({
        status: "SUCCESS",
      });

      const res = await attestProofOnChain(validWallet, "age_over_18", ["1"]);
      expect(res.success).toBe(true);
      expect(res.txHash).toBe("0xhash");
    });

    test("returns error if tx fails on chain", async () => {
      mockServer.sendTransaction.mockResolvedValue({
        status: "PENDING",
        hash: "0xhash",
      });
      mockServer.getTransaction.mockResolvedValue({
        status: "FAILED",
      });

      const res = await attestProofOnChain(validWallet, "age_over_18", ["1"]);
      expect(res.success).toBe(false);
      expect(res.error).toBe("tx status: FAILED");
    });
  });

  describe("checkVerificationOnChain", () => {
    test("throws error if simulation fails", async () => {
      mockServer.simulateTransaction.mockResolvedValue({
        isSuccess: false,
        error: "Simulation error",
      });

      await expect(checkVerificationOnChain(validWallet, "age_over_18")).rejects.toThrow(
        "RPC simulation failed: Simulation error"
      );
    });

    test("returns true if verified", async () => {
      mockServer.simulateTransaction.mockResolvedValue({
        isSuccess: true,
        result: {
          retval: "mockScValTrue",
        },
      });

      const res = await checkVerificationOnChain(validWallet, "age_over_18");
      expect(res).toBe(true);
    });
  });
});
