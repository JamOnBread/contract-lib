import {JobCardano} from "@jamonbread/sdk"
import { Lucid } from "lucid-cardano"

const lucid = await Lucid.new(undefined, "Preprod")
const job = new JobCardano(lucid)
console.log(job.treasuryDatum)
