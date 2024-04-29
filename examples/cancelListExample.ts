// @ts-ignore
import { JobCardano } from "@jamonbread/sdk";
import { Blockfrost, Lucid } from "lucid-cardano";

const cancelList = async (
  // *** unit is a policyId + assetNameHex string
  unit: string
) => {
  const lucid = await Lucid.new(
    // *** Replace with actual Blockfrost data (see setupExample.ts)
    new Blockfrost("blockfrostUrl", "blockfrostProjectId"),
    "Preprod"
  );
  // *** Create a new job instance
  const job = new JobCardano(lucid);

  // *** Get the UTXO of the NFT listing
  const utxo = await lucid.utxoByUnit(unit);

  // *** Provide the UTXO to the job instantBuyCancel function
  const txHash = await job.instantBuyCancel(utxo);
  return txHash;
};

// *** Replace with actual data here
cancelList(
  "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737446f6d696e615468654272656164"
);
