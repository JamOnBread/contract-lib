// @ts-nocheck

// *** instantBuyUpdate function has two required parameters: unit string (policyId + assetName) and new price

const unit = nftListing.policyId + nftListing.assetNameHex;
const txHash = await job.instantBuyUpdate(unit, BigInt(priceInLovelace));
