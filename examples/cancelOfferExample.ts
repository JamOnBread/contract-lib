// @ts-ignore
import { JobCardano } from "@jamonbread/sdk";
import { Blockfrost, Lucid } from "lucid-cardano";

const cancelOffer = async (listingTxHash: string, listingUtxoIndex: number) => {
  const lucid = await Lucid.new(
    // *** Replace with actual Blockfrost data (see setupExample.ts)
    new Blockfrost("blockfrostUrl", "blockfrostProjectId"),
    "Preprod"
  );
  // *** Create a new job instance
  const job = new JobCardano(lucid);

  // *** offerCancel function has two required parameters: listingTxHash and outputIndex
  const txHash = await job.offerCancel({
    // *** listingTxHash is the hash of the listing you want to cancel the offer for
    txHash: listingTxHash,
    // *** outputIndex is the output index of the listing you want to cancel the offer for (usually 0)
    outputIndex: listingUtxoIndex,
  });

  return txHash;
};

// *** Replace with actual data here
cancelOffer("listingTxHash", 0);
