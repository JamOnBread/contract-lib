// @ts-ignore
import { JobCardano, Portion } from "@jamonbread/sdk";
import { Blockfrost, Lucid } from "lucid-cardano";

const makeOffer = async (
  policyId: string,
  assetName: string,
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

  // *** offerList function has two required parameters: unit object (policyId + assetName) and price
  // *** offerList function has three optional parameters: listing, affiliate and royalty
  const txHash = await job.offerList(
    // *** When only policyId is filled in the unit object and assetName is undefined, that means the offer is the collection offer
    // *** When the assetName is specified, the offer is for a single asset
    { policyId: policyId, assetName: assetName },
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
makeOffer(
  "policyId",
  "assetName",
  0,
  undefined,
  undefined,
  undefined,
  undefined
);
