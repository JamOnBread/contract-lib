// @ts-ignore
import { job, unit, outRef, marketTreasury, affiliateTreasury } from "./shared"


const txHash = await job.offerCancel(outRef)
await job.awaitTx(txHash)
console.log(txHash)
