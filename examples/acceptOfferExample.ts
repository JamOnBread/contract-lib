import { Blockfrost, Lucid } from "lucid-cardano";
// @ts-ignore
import { JobCardano, Portion } from "@jamonbread/sdk";

const acceptOffer = async (
  listingTxHash: string,
  listingUtxoIndex: number,
  // *** unit is a policyId + assetNameHex string
  unit: string,
  // *** affiliate treasury of your own marketplace
  marketplaceTreasury: string,
  // *** force is a boolean that forces the transaction to go through even if there are no available UTXOs in the wallet
  // *** force is set to false by default, if set to true, the price of the TX will be higher based on the number of UTXOs needed to cover the transaction
  force?: boolean,
  // *** there may be multiple treasuries that will receive a percentage of the total price
  // *** in this example, there are two treasuries: affiliate and sub-affiliate
  affilTreasury?: string,
  subAffilTreasury?: string
) => {
  const lucid = await Lucid.new(
    // *** Replace with actual Blockfrost data (see setupExample.ts)
    new Blockfrost("blockfrostUrl", "blockfrostProjectId"),
    "Preprod"
  );
  // *** Create a new job instance
  const job = new JobCardano(lucid);

  // *** portions is an array of objects with two keys: percent and treasury
  // *** percent is the percentage of the total price that will go to the treasury
  // *** treasury is the treasury datum of the treasury that will receive the percentage of the total price
  // *** there may be as many objects in the array as needed, but the sum of all percentages must be equal to 1 (100%)
  let portions = [] as Portion[];

  // *** Example if no treasuries (affiliate or sub-affiliate) are provided
  if (!affilTreasury && !subAffilTreasury) {
    portions = [{ percent: 1, treasury: marketplaceTreasury }];

    // *** Example if only affiliate treasury is provided
  } else if (affilTreasury && !subAffilTreasury) {
    portions = [
      { percent: 0.6, treasury: marketplaceTreasury },
      { percent: 0.4, treasury: affilTreasury },
    ];

    // *** Example if both affiliate and sub-affiliate treasuries are provided
  } else if (affilTreasury && subAffilTreasury) {
    portions = [
      { percent: 0.5, treasury: marketplaceTreasury },
      { percent: 0.4, treasury: affilTreasury },
      {
        percent: 0.1,
        treasury: subAffilTreasury,
      },
    ];
  }

  // *** offerProceed function has one required parameter (utxo) and two optional parameters (force and portions array)
  const txHash = await job.offerProceed(
    { txHash: listingTxHash, outputIndex: listingUtxoIndex },
    unit,
    force,
    // *** portions is an array of objects with two keys: percent and treasury
    // *** percent is the percentage of the total price that will go to the treasury
    // *** treasury is the treasury datum of the treasury that will receive the percentage of the total price
    ...portions
  );

  return txHash;
};

// *** Replace with actual data here
acceptOffer(
  "listingTxHash",
  0,
  "unit",
  "marketplaceTreasury",
  false,
  undefined,
  undefined
);
