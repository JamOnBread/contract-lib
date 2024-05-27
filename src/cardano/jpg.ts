/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

import { Data, Constr, Lucid, Tx, UTxO, fromHex, toHex, C } from "lucid-cardano"
import { ContractBase, ContractType, parseAddress } from "./contract"
import { Transaction } from "./transaction"
import { JobCardano } from "../index"

export type JpgDatum = {
    address: string,
    payouts: Record<string, bigint>
}


export class JpgContractUnknown extends ContractBase {
    constructor(active: boolean, hash: string) {
        super(ContractType.JPG, active, hash)
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {
        throw new Error("Not implemented")
    }

    public parseDatum<JpgDatum>(job: JobCardano, datumString: string): JpgDatum {
        throw new Error("Not implemented")
    }
}

export class JpgContract1 extends JpgContractUnknown {
    readonly jpgAddress: string

    constructor(active: boolean, hash: string, jpgAddress: string) {
        super(active, hash)
        this.jpgAddress = jpgAddress
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {

        const datum = await job.provider.getDatum(utxo.datumHash!)
        const jpgParams = this.parseDatum(job, datum) as JpgDatum
        let buildJpg = await tx.spend(utxo, Data.to(new Constr(0, [0n])))

        let sumAmount = 0n
        for (const [address, amount] of Object.entries(jpgParams.payouts)) {
            sumAmount += amount
        }

        const datumJpg = Data.to(toHex(C.hash_blake2b256(fromHex(Data.to(
            new Constr(0, [new Constr(0, [utxo.txHash]), BigInt(utxo.outputIndex)]),
        )))))

        buildJpg = buildJpg.payTo(
            this.jpgAddress,
            { lovelace: sumAmount * 50n / 49n / 50n },
            datumJpg
        )

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

export class JpgContract2 extends ContractBase {

    constructor(active: boolean, hash: string) {
        super(ContractType.JPG, active, hash)
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {

        const datum = await job.provider.getDatum(utxo.datumHash!)
        const jpgParams = this.parseDatum(job, datum) as JpgDatum
        let buildJpg = await tx.spend(utxo, Data.to(new Constr(0, [0n])))

        let sumAmount = 0n
        for (const [address, amount] of Object.entries(jpgParams.payouts)) {
            sumAmount += amount
        }

        for (const [address, amount] of Object.entries(jpgParams.payouts)) {
            buildJpg = buildJpg.payTo(address, { lovelace: amount })
        }
        buildJpg = buildJpg.sign(await job.lucid.wallet.address());
        return buildJpg
    }

    public parseDatum<JpgDatum>(job: JobCardano, datumString: string): JpgDatum {
        const datum: Constr<any> = Data.from(datumString)
        const payouts: Record<string, bigint> = {}
        for (let row of datum.fields[1]) {
            payouts[parseAddress(job, row.fields[0])] = BigInt(row.fields[1].get('').fields[1].get(''))
        }
        return {
            address: datum.fields[0] as string,
            payouts
        } as JpgDatum
    }
}