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

import { Data, Constr, paymentCredentialOf } from "lucid-cardano"
import type { Credential, Lucid, OutRef, Tx, UTxO } from "lucid-cardano"
import type { Portion, WantedAsset, InstantBuyDatumV1, OfferDatumV1, JpgDatum } from "./definitions"

export enum ContractType {
    Unknown,
    JobTreasury,
    JobInstantBuy,
    JobOffer,
    JobStake,
    JobLock,

    JPG,
}

export type Contract = {
    type: ContractType,
    active: boolean,
    hash: string,
    treasury?: Contract

    collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx>
    attachTx(lucid: Lucid, tx: Tx): Promise<Tx>
    parseDatum(lucid: Lucid, datum: string): any
    getAddress(lucid: Lucid, stakeId?: number): string
    getStakeNumber(): number
}

export class ContractBase implements Contract {
    readonly type: ContractType
    readonly active: boolean
    readonly hash: string
    readonly treasury?: Contract
    private ref?: OutRef
    private script?: string
    private utxo?: UTxO
    private stakes?: string[]

    constructor(type: ContractType, active: boolean, hash: string, ref?: OutRef, script?: string, tresury?: Contract, stakes?: string[]) {
        this.type = type
        this.active = active
        this.ref = ref
        this.hash = hash
        this.utxo = undefined
        this.script = script
        this.treasury = tresury
        this.stakes = stakes
    }

    async getUtxo(lucid: Lucid): Promise<UTxO | undefined> {
        if (this.utxo) return this.utxo
        if (this.ref) {
            const [utxo] = await lucid.utxosByOutRef([this.ref])!
            this.utxo = utxo
            return utxo
        }
    }

    async collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx> {
        tx = tx.collectFrom([utxo], redeemer)
        tx = await this.attachTx(lucid, tx)
        return tx
    }

    async attachTx(lucid: Lucid, tx: Tx): Promise<Tx> {
        const utxo = await this.getUtxo(lucid)

        if (utxo) {
            return tx.readFrom([utxo])
        }
        else if (this.script) {
            // Does not care about kind of validator
            return tx.attachSpendingValidator({
                type: 'PlutusV2',
                script: this.script
            })
        }

        throw new Error("There is no script")
    }

    parseDatum(lucid: Lucid, datum: string): any {
        throw new Error("No script provided")
    }

    getStake(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.stakes!.length)

        return this.stakes![stakeId % this.stakes!.length]
    }

    getAddress(lucid: Lucid, stakeId?: number): string {
        const paymentCredential = {
            type: "Script",
            hash: this.hash
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.getStake(stakeId)
        } as Credential

        return lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    getStakeNumber(): number {
        return this.stakes?.length || 0
    }
}

export class Context {

    readonly jobApiUrl: string
    readonly jobTokenPolicy: string
    readonly jobTokenName: string
    readonly numberOfToken: number
    readonly minimumAdaAmount: bigint = 2_000_000n
    readonly minimumJobFee: bigint = 100_000n
    readonly minimumFee = 20_001n

    readonly contracts: Contract[]

    constructor(
        jobApiUrl: string,
        jobTokenPolicy: string,
        jobTokenName: string,
        numberOfToken: number,
        contracts: Contract[]) {
        this.jobApiUrl = jobApiUrl

        this.jobTokenPolicy = jobTokenPolicy
        this.jobTokenName = jobTokenName
        this.numberOfToken = numberOfToken

        this.contracts = contracts
    }

    public getContractByHash(hash: string): Contract {
        const contract = this.contracts.find(contract => (hash == contract.hash))
        if (contract) {
            return contract
        }
        throw new Error("No contract found")
    }
    public getContractByAddress(address: string): Contract {

        const paymentCred = paymentCredentialOf(address)
        if (paymentCred) {
            return this.getContractByHash(paymentCred.hash)!
        }

        throw new Error("No contract found")
    }

    public getContract(type: ContractType): Contract {
        return this.contracts.find(contract => (contract.active && contract.type == type))!
    }
}

export function parseRoyalty(datum: Constr<any>): Portion | undefined {
    if (datum.index == 0) {
        return {
            percent: Number(datum.fields[0].fields[0]) / 10_000,
            treasury: Data.to(datum.fields[0].fields[1])
        }
    } else {
        return undefined
    }
}

export function parseWantedAsset(datum: Constr<any>): WantedAsset {
    if (datum.index == 0) {
        return {
            policyId: datum.fields[0].fields[0],
            assetName: datum.fields[0].fields[1]
        }
    } else {
        return {
            policyId: datum.fields[0],
            assetName: undefined
        }
    }
}

export function parseAddress(lucid: Lucid, datum: Constr<any>): string {
    const paymentCred = datum.fields[0].fields[0]
    const stakeCred = datum.fields[1].index == 0 ?
        datum.fields[1].fields[0].fields[0].fields[0]
        :
        undefined
    const address = lucid.utils.credentialToAddress(
        lucid.utils.keyHashToCredential(paymentCred),
        stakeCred ? lucid.utils.keyHashToCredential(stakeCred) : undefined
    )
    return address
}

export class JobContract extends ContractBase { }
export class JobContractInstantBuy extends JobContract {

    public parseDatum(lucid: Lucid, datumString: string): InstantBuyDatumV1 {
        const datumParsed: Constr<any> = Data.from(datumString)

        const beneficier = parseAddress(lucid, datumParsed.fields[0])
        const listingMarketDatum = Data.to(datumParsed.fields[1])
        const listingAffiliateDatum = datumParsed.fields[2].index == 0 ? Data.to(datumParsed.fields[2].fields[0]) : listingMarketDatum
        const amount = datumParsed.fields[3]
        const royalty = parseRoyalty(datumParsed.fields[4])

        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            royalty
        }
    }
}
export class JobContractOffer extends JobContract {
    public parseDatum(lucid: Lucid, datumString: string): OfferDatumV1 {
        const datum: Constr<any> = Data.from(datumString)

        const beneficier = parseAddress(lucid, datum.fields[0])
        const listingMarketDatum = Data.to(datum.fields[1]).toLowerCase()
        const listingAffiliateDatum = (datum.fields[2].index == 0 ? Data.to(datum.fields[2].fields[0]) : listingMarketDatum).toLowerCase()
        const amount = datum.fields[3]
        const wantedAsset = parseWantedAsset(datum.fields[4])
        const royalty = parseRoyalty(datum.fields[5])

        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            wantedAsset,
            royalty
        }

    }
}
export class JpgContract extends ContractBase {
    async collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined = Data.void()): Promise<Tx> {
        console.log("Redeemer", redeemer)
        tx = tx.collectFrom([utxo], redeemer)
        tx = await this.attachTx(lucid, tx)
        return tx
    }

    public parseDatum(lucid: Lucid, datumString: string): JpgDatum {
        const datum: Constr<any> = Data.from(datumString)
        const payouts: Record<string, bigint> = {}
        for (let row of datum.fields[0]) {
            payouts[parseAddress(lucid, row.fields[0])] = BigInt(row.fields[1])
        }
        return {
            address: datum.fields[1],
            payouts
        }
    }
}
