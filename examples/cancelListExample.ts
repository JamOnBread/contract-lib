//@ts-nocheck

// *** Get the UTXO of the NFT listing
const utxo = await lucid.utxoByUnit(
  nftListing.policyId + nftListing.assetNameHex
);

// *** Provide the UTXO to the job instantBuyCancel function
const txHash = await job.instantBuyCancel(utxo);
