
import { Data, Constr, Lucid, Tx, UTxO, fromHex, toHex, C } from "lucid-cardano"
import { ContractBase, ContractType, parseAddress } from "./contract"
import { Transaction } from "./transaction"
import { JobCardano } from "../index"

export type JpgDatum = {
    address: string,
    payouts: Record<string, bigint>
}


export class JpgContract extends ContractBase {
    readonly jpgAddress: string

    constructor(active: boolean, hash: string, jpgAddress: string) {
        super(ContractType.JPG, active, hash)
        this.jpgAddress = jpgAddress
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {

        const jpgParams = this.parseDatum(job, utxo.datum!) as JpgDatum
        let buildJpg = await tx.spend(utxo, Data.to(new Constr(0, [0n])))

        let sumAmount = 0n
        for (const [address, amount] of Object.entries(jpgParams.payouts)) {
            sumAmount += amount
        }

        buildJpg = buildJpg.payTo(
            this.jpgAddress,
            { lovelace: sumAmount * 50n / 49n / 50n }),
            Data.to(toHex(C.hash_blake2b256(fromHex(Data.to(
                new Constr(0, [new Constr(0, [utxo.txHash]), BigInt(utxo.outputIndex)]),
            )))))

        for (const [address, amount] of Object.entries(jpgParams.payouts)) {
            buildJpg = buildJpg.payTo(address, { lovelace: amount })
        }
        buildJpg = buildJpg.sign(await job.lucid.wallet.address());
        return buildJpg
    }

    public parseDatum<JpgDatum>(job: JobCardano, datumString: string): JpgDatum {
        const datum: Constr<any> = Data.from(datumString)
        const payouts: Record<string, bigint> = {}
        for (let row of datum.fields[0]) {
            payouts[parseAddress(job, row.fields[0])] = BigInt(row.fields[1])
        }
        return {
            address: datum.fields[1] as string,
            payouts
        } as JpgDatum
    }
}
