//@ts-nocheck

// *** instantBuyList function has two required parameters: unit object (policyId + assetName) and price

// *** instantBuyList function has three optional parameters: listing, affiliate and royalty

// *** listing parameter is the treasury datum of the listing marketplace

// *** affiliate parameter takes a string of the affiliate treasury datum

// *** royalty paramater takes a Portion object with treasury datum and percentage

const royalties: Portion | undefined = royalty
  ? {
      treasury: job.addressToDatum(royaltyAddress),
      percent: royalty.royaltyPercentage,
    }
  : undefined;

let txHash = "";
let affiliate = undefined;

txHash = await job.instantbuyList(
  nftListing.policyId + nftListing.assetNameHex,
  BigInt(priceInLovelace),
  undefined,
  affiliate,
  royalties
);
