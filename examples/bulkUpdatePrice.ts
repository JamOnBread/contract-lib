//@ts-nocheck

// *** This function enables you to update the price of multiple NFTs in a single transaction

// *** instantBuyUpdateTx takes three required parameters: tx, item (policyId + assetNameHex) and new price

// *** instantBuyUpdateTx takes three required parameters: listing, affiliate and royalty

// *** listing parameter is the treasury datum of the listing marketplace

// *** affiliate parameter takes a string of the affiliate treasury datum

// *** royalty paramater takes a Portion object with treasury datum and percentage

// *** Start by creating an empty transaction that will be put into the function on every iteration
let tx = lucid.newTx();

for (const item of items) {
  tx = await job.instantBuyUpdateTx(
    tx,
    item.policyId + item.assetNameHex,
    BigInt(item.price),
    listing,
    affiliate,
    {
      percent: royalties.rate,
      treasury: royalties.treasuryDatum,
    }
  );
}

const txHash = await job.finishTx(tx);
