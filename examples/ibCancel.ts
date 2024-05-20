// @ts-ignore
import { job, unit } from "./shared"

const cancelList = async (
  // *** unit is a policyId + assetNameHex string
  unit: string
) => {
  const utxo = await job!.lucid.utxoByUnit(unit);
  // *** Provide the UTXO to the job instantBuyCancel function
  const txHash = await job.instantBuyCancel(utxo);
  return txHash;
};

// *** Replace with actual data here
const txHash = await cancelList(unit)
await job.awaitTx(txHash)
console.log(txHash)
