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
updatePrice("unit", 0);
