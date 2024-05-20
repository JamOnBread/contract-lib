// @ts-ignore
import { job, unit } from "./shared"

const updatePrice = async (unit: string, priceInLovelace: number) => {
  // *** instantBuyUpdate function has two required parameters: unit string (policyId + assetName) and new price
  const txHash = await job.instantBuyUpdate(unit, BigInt(priceInLovelace))
  return txHash
};

// *** Replace with actual data here
const txHash = await updatePrice(
  unit,
  10000000
)
await job.awaitTx(txHash)
console.log(txHash)
