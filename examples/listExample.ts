import { Blockfrost, Lucid } from "lucid-cardano";
// @ts-ignore
import { JobCardano, Portion } from "@jamonbread/sdk";

const listAsset = async (
  unit: string,
  priceInLovelace: number,
  affiliateDatum?: string,
  marketListing?: string,
  royaltyAddress?: string,
  royaltyPercentage?: number
) => {
  const lucid = await Lucid.new(
    // *** Replace with actual Blockfrost data (see setupExample.ts)
    new Blockfrost("blockfrostUrl", "blockfrostProjectId"),
    "Preprod"
  );
  // *** Create a new job instance
  const job = new JobCardano(lucid);

  const royalties: Portion | undefined =
    royaltyAddress && royaltyPercentage
      ? {
          treasury: job.addressToDatum(royaltyAddress),
          percent: royaltyPercentage,
        }
      : undefined;

  // *** instantBuyList function has two required parameters: unit string (policyId + assetNameHex) and price
  // *** instantBuyList function has three optional parameters: listing, affiliate and royalty
  const txHash = await job.instantbuyList(
    // *** unit is a policyId + assetNameHex string
    unit,
    BigInt(priceInLovelace),
    // *** listing parameter is the treasury datum of the listing marketplace
    marketListing,
    // *** affiliate parameter takes a string of the affiliate treasury datum
    affiliateDatum,
    // *** royalty paramater takes a Portion object with treasury datum and percentage
    royalties
  );

  return txHash;
};

// *** Replace with actual data here
listAsset("unit", 0, undefined, undefined, undefined);
