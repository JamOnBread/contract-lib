// @ts-ignore
import { Portion } from "@jamonbread/sdk";
import { lucid, job } from "./shared"

const bulkUpdatePrice = async (
  items: { policyId: string; assetNameHex: string; price: number }[],
  affiliateDatum?: string,
  marketListing?: string,
  royalty?: Portion
) => {

  // *** Start by creating an empty transaction that will be put into the function on every iteration
  let tx = job.newTx()

  for (const item of items) {
    // *** This function enables you to update the price of multiple NFTs in a single transaction
    // *** instantBuyUpdateTx takes three required parameters: tx, item (policyId + assetNameHex) and new price
    // *** instantBuyUpdateTx takes three optional parameters: listing, affiliate and royalty
    tx = await job.instantBuyUpdateTx(
      tx,
      item.policyId + item.assetNameHex,
      BigInt(item.price),
      /*
      // *** listing parameter is the treasury datum of the listing marketplace
      marketListing,
      // *** affiliate parameter takes a string of the affiliate treasury datum
      affiliateDatum,
      // *** royalty paramater takes a Portion object with treasury datum and percentage
      royalty
      */
    );
  }

  const txHash = await job.finishTx(await tx.lucid())
  return txHash
}

// *** Replace with actual data here
console.log(await bulkUpdatePrice(
  [
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "4d696b73615468654861697279",
      price: 6000000,
    },
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "4d696b73615468654861697279",
      price: 7000000,
    },
  ],
  "affiliateDatum",
  "marketplaceAffiliateDatum",
  {

    percent: 0.15,
    treasury: "royaltyTreasury",
  }
))
