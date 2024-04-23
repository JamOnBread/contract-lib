// @ts-nocheck

// *** offerProceed (offer accept) function has one required parameter (utxo) and two optional parameters (force and portions array)

// *** force is a boolean that forces the transaction to go through even if there are no available UTXOs in the wallet
// *** force is set to false by default, if set to true, the price of the TX will be higher based on the number of UTXOs needed to cover the transaction

// *** portions is an array of objects with two keys: percent and treasury
// *** percent is the percentage of the total price that will go to the treasury
// *** treasury is the treasury datum of the treasury that will receive the percentage of the total price
// *** there may be as many objects in the array as needed, but the sum of all percentages must be equal to 1 (100%)

// *** If no treasuries (affiliate or sub-affiliate) are provided

const txHash = await job.offerProceed(
  { txHash: offer.listingTxHash, outputIndex: offer.listingUtxoIndex },
  (offer.nft?.policyId || offer.collection.policyIds[0]) + tokenName,
  force,
  ...portions
);
