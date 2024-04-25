// @ts-ignore
import { JobCardano, Portion } from "@jamonbread/sdk";
import { Blockfrost, Lucid } from "lucid-cardano";

const bulkUpdatePrice = async (
  items: { policyId: string; assetNameHex: string; price: number }[],
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

  // *** Start by creating an empty transaction that will be put into the function on every iteration
  let tx = lucid.newTx();

  for (const item of items) {
    // *** This function enables you to update the price of multiple NFTs in a single transaction
    // *** instantBuyUpdateTx takes three required parameters: tx, item (policyId + assetNameHex) and new price
    // *** instantBuyUpdateTx takes three optional parameters: listing, affiliate and royalty
    tx = await job.instantBuyUpdateTx(
      tx,
      item.policyId + item.assetNameHex,
      BigInt(item.price),
      // *** listing parameter is the treasury datum of the listing marketplace
      marketListing,
      // *** affiliate parameter takes a string of the affiliate treasury datum
      affiliateDatum,
      // *** royalty paramater takes a Portion object with treasury datum and percentage
      royalties
    );
  }

  const txHash = await job.finishTx(tx);
  return txHash;
};

// *** Replace with actual data here
bulkUpdatePrice(
  [
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "446f6d696e615468654272656164",
      price: 6000000,
    },
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "446f6d696e615468654272656164",
      price: 7000000,
    },
  ],
  "affiliateDatum",
  "marketplaceAffiliateDatum",
  "royaltyAddress",
  0.15
);
