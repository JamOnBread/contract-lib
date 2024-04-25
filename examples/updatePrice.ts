// @ts-ignore
import { JobCardano } from "@jamonbread/sdk";
import { Blockfrost, Lucid } from "lucid-cardano";

const updatePrice = async (unit: string, priceInLovelace: number) => {
  const lucid = await Lucid.new(
    // *** Replace with actual Blockfrost data (see setupExample.ts)
    new Blockfrost("blockfrostUrl", "blockfrostProjectId"),
    "Preprod"
  );
  // *** Create a new job instance
  const job = new JobCardano(lucid);

  // *** instantBuyUpdate function has two required parameters: unit string (policyId + assetName) and new price
  const txHash = await job.instantBuyUpdate(unit, BigInt(priceInLovelace));
  return txHash;
};

// *** Replace with actual data here
updatePrice(
  "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737446f6d696e615468654272656164",
  0
);
