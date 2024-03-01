#!/usr/bin/env node --loader tsx

import { JobCardano } from "@jamonbread/sdk"
import { Lucid } from "lucid-cardano"

const lucid = await Lucid.new(undefined, "Preprod")
const job = new JobCardano(lucid)

/**
// Contract interaction
const unit = policyId + assetName;
const affiliateString =
const listingTxHash = await job.instantbuyList(policyId + assetName, 10_000_000n)
const cancelTxHash = await job.instantBuyCancel(await lucid.utxoByUnit(unit))
const proceedTxHash = await job.instantBuyProceed(await lucid.utxoByUnit(unit), false)

// Treasury interaction
const createTreasuryTxHash = await job.createTreasuryAddress(await lucid.wallet.address(), 3, 6)
const withdrawTreasuryTxHash = await job.withdrawTreasury(affiliateString)
*/