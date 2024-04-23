//@ts-nocheck

// *** listingTxHash is the hash of the listing you want to cancel the offer for

// *** outputIndex is the output index of the listing you want to cancel the offer for (usually 0)

const txHash = await job.offerCancel({
  txHash: listingTxHash,
  outputIndex: outputIndex,
});
