import { rpc } from "@stellar/stellar-sdk";
type SimResult = rpc.Api.SimulateTransactionResponse;
// check if result or results exists
const x: SimResult = {} as any;
const y = x.results;
const z = x.result;
