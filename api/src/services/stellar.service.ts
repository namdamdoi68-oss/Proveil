import {
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  Address,
  scValToNative,
} from "@stellar/stellar-sdk";
import { config } from "../config";

const server = new rpc.Server(config.stellar.rpcUrl);
const contract = new Contract(config.stellar.contractId);

export interface AttestResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function attestProofOnChain(
  walletAddress: string,
  proofType: string,
  publicSignals: string[],
): Promise<AttestResult> {
  try {
    const verifierKeypair = Keypair.fromSecret(
      config.stellar.verifierSecretKey,
    );
    const verifierAccount = await server.getAccount(
      verifierKeypair.publicKey(),
    );

    const walletScVal = new Address(walletAddress).toScVal();
    const proofTypeScVal = nativeToScVal(proofType, { type: "string" });
    const publicSignalsScVal = xdr.ScVal.scvVec(
      publicSignals.map((s) => nativeToScVal(s, { type: "string" })),
    );

    // Wrap in PublicSignals struct
    const publicSignalsStruct = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("signals"),
        val: publicSignalsScVal,
      }),
    ]);

    const tx = new TransactionBuilder(verifierAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "verify_proof",
          new Address(verifierKeypair.publicKey()).toScVal(),
          walletScVal,
          proofTypeScVal,
          publicSignalsStruct,
        ),
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(tx);
    preparedTx.sign(verifierKeypair);

    const result = await server.sendTransaction(preparedTx);

    if (result.status === "ERROR") {
      return { success: false, error: result.errorResult?.toXDR("base64") };
    }

    // Poll for confirmation
    let getResult = await server.getTransaction(result.hash);
    let attempts = 0;
    while (getResult.status === "NOT_FOUND" && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1500));
      getResult = await server.getTransaction(result.hash);
      attempts++;
    }

    if (getResult.status === "SUCCESS") {
      return { success: true, txHash: result.hash };
    } else {
      return { success: false, error: `tx status: ${getResult.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function checkVerificationOnChain(
  walletAddress: string,
  proofType: string,
): Promise<boolean> {
  try {
    const verifierKeypair = Keypair.fromSecret(
      config.stellar.verifierSecretKey,
    );
    const verifierAccount = await server.getAccount(
      verifierKeypair.publicKey(),
    );

    const tx = new TransactionBuilder(verifierAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        contract.call(
          "is_verified",
          new Address(walletAddress).toScVal(),
          nativeToScVal(proofType, { type: "string" }),
        ),
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(result)) {
      return scValToNative(result.result!.retval) as boolean;
    }
    return false;
  } catch {
    return false;
  }
}
