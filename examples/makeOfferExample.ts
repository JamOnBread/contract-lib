// @ts-nocheck

// *** offerList function has two required parameters: unit object (policyId + assetName) and price

// *** offerList function has three optional parameters: listing, affiliate and royalty

// *** listing parameter is the treasury datum of the listing marketplace

// *** affiliate parameter takes a string of the affiliate treasury datum

// *** royalty paramater takes a Portion object with treasury datum and percentage
const royalties: Portion | undefined = royalty
  ? {
      treasury: job.addressToDatum(royalty.royaltyAddressStr),
      percent: royaltyPercentage,
    }
  : undefined;

// *** Make offer for the single asset
const txHash = await job.offerList(
  {
    policyId: nftListing?.policyId,
    assetName: nftListing?.assetNameHex,
  },
  BigInt(priceInLovelace),
  undefined,
  affiliate,
  royalties
);

// *** Make offer for the collection
const txHash = await job.offerList(
  // *** In this case, only policyId is filled in the unit object, assetName is undefined
  { policyId: collection.policyIds[0], assetName: undefined },
  BigInt(priceInLovelace),
  undefined,
  affiliate,
  royalties
);
