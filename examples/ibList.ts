import { Portion } from "@jamonbread/sdk";
import { job, unit } from "./shared"

const listAsset = async (
  unit: string,
  priceInLovelace: number,
  affiliateDatum?: string,
  marketListing?: string,
  royalty?: Portion,
) => {

  // *** instantBuyList function has two required parameters: unit string (policyId + assetNameHex) and price
  // *** instantBuyList function has three optional parameters: listing, affiliate and royalty
  const txHash = await job.instantBuyList(
    // *** unit is a policyId + assetNameHex string
    unit,
    BigInt(priceInLovelace),
    // *** listing parameter is the treasury datum of the listing marketplace
    marketListing,
    // *** affiliate parameter takes a string of the affiliate treasury datum
    affiliateDatum,
    // *** royalty paramater takes a Portion object with treasury datum and percentage
    royalty
  );

  return txHash;
};

// *** Replace with actual data here
const hash = await listAsset(
  unit,
  10_000_000
)
await job.awaitTx(hash)
console.log(hash)
