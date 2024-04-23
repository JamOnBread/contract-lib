//@ts-nocheck

// *** Create a new Lucid instance that takes Blockfrost instance and network string ("Mainnet" or "Preprod")
const lucid = await Lucid.new(
  new Blockfrost(blockfrostUrl, blockfrostProjectId),
  network
);

// *** Provide lucid instance to the job
const job = new JobCardano(lucid);
