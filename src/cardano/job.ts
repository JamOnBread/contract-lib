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

import { Data, Constr, UTxO, Unit, paymentCredentialOf, Assets, slotToBeginUnixTime } from "lucid-cardano"
import { ContractBase, Contract, ContractType, parseAddress } from "./contract"
import { Transaction } from "./transaction"
import { encodeRoyalty, encodeWantedAsset } from "../common"
import { JobCardano } from "../index"

export type Portion = {
    percent: number,
    treasury: string,
}

export type WantedAsset = {
    policyId: string,
    assetName: string | undefined
}

export type InstantBuyDatumV1 = {
    beneficier: string,
    listingMarketDatum: string,
    listingAffiliateDatum: string,
    amount: bigint,
    royalty: Portion | undefined
}

export type OfferDatumV1 = {
    beneficier: string,
    listingMarketDatum: string,
    listingAffiliateDatum: string,
    amount: bigint,
    wantedAsset: WantedAsset,
    royalty: Portion | undefined
}

export type ParametresV1 = {
    minimumFee: number,
    minimumJobFee: number,
    jobTreasury: string,
    minUtxoValue: number,
    addToTreasury: number,
    addToPrice: number
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

export class JobContract extends ContractBase {
    readonly parameters: ParametresV1

    constructor(type: ContractType, active: boolean, hash: string, parametres: ParametresV1, stakes?: string[], treasury?: Contract) {
        super(type, active, hash, stakes, treasury)
        this.parameters = parametres
    }

    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined {
        const index = treasuries.findIndex((value: UTxO) => {
            return value.datum == datum
        })

        if (index > -1) {
            const element = treasuries[index]
            // Removed splice
            // treasuries.splice(index, 1)
            return element
        }
        return undefined
    }

    addToTreasuries(treasuries: Map<string, bigint>, datum: string, value: bigint) {
        const prev = treasuries.get(datum) || 0n
        treasuries.set(datum, prev + value)
    }

    async payToTreasuries(job: JobCardano, tx: Transaction, contract: Contract, utxo: UTxO, payToTreasuries: Map<string, bigint>, force: boolean): Promise<Transaction> {
        // JoB treasury
        const treasuryRequest = await job.getTreasuriesReserve(utxo, Array.from(payToTreasuries.keys()), force)

        if (!treasuryRequest.all && !force) {
            throw new Error('Treasuries are not avaible')
        }
        const allTreasuries = await job.provider.getUtxosByOutRef(Object.values(treasuryRequest.utxos))
        const treasuryAddress = contract.getAddress(job)


        // Pay to treasuries
        for (let [datum, _] of payToTreasuries) {
            const treasury = this.getTreasury(allTreasuries, datum)
            let amount = Number(payToTreasuries.get(datum)!) + this.parameters.addToTreasury

            if (datum == this.parameters.jobTreasury) {
                amount = Math.max(Number(this.parameters.minimumJobFee), amount)
            } else {
                amount = Math.max(Number(this.parameters.minimumFee), amount)
            }
            // Treasury exists
            if (treasury) {
                const contract = await job.context.getContractByAddress(treasury.address)
                tx = await contract.processTx(job, tx, treasury)

                tx = tx.payToAdd(
                    treasury.address,
                    { lovelace: BigInt(treasury.assets.lovelace) + BigInt(amount) },
                    datum
                )
            }
            // There is no free treasury
            else {
                tx = tx.payToAdd(
                    treasuryAddress,
                    { lovelace: BigInt(amount) },
                    datum
                )
            }
        }
        return tx
    }
}



export class JobContractInstantBuy extends JobContract {
    public parseDatum<InstantBuyDatumV1>(job: JobCardano, datumString: string): InstantBuyDatumV1 {
        const datumParsed: Constr<any> = Data.from(datumString)

        const beneficier = parseAddress(job, datumParsed.fields[0])
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
        } as InstantBuyDatumV1
    }

    async listTx(job: JobCardano, tx: Transaction, unit: Unit, price: bigint, listingMarket?: string, listingAffiliate?: string, royalty?: Portion): Promise<Transaction> {
        if (typeof listingMarket == "undefined") {
            listingMarket = this.parameters.jobTreasury
        }

        const sellerAddr = await job.getEncodedAddress()
        const datum = new Constr(0, [
            sellerAddr,
            Data.from(listingMarket),
            listingAffiliate ? new Constr(0, [Data.from(listingAffiliate)]) : new Constr(1, []),
            price,
            encodeRoyalty(royalty)
        ]);

        tx = await tx.payTo(this.getAddress(job), { [unit]: 1n }, Data.to(datum))
        return tx
    }
    // Buy listing or spend treasury
    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, force: boolean, ...sellMarketPortions: Portion[]): Promise<Transaction> {
        const params = this.parseDatum<InstantBuyDatumV1>(job, utxo.datum!)
        const provision = 0.025 * Number(params.amount)
        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.parameters.jobTreasury, BigInt(Math.ceil(provision * 0.1)))

        this.addToTreasuries(payToTreasuries, params.listingMarketDatum, BigInt(Math.ceil(Number(provision) * 0.2)))
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum, BigInt(Math.ceil(Number(provision) * 0.2)))

        for (let portion of sellMarketPortions) {
            this.addToTreasuries(
                payToTreasuries,
                portion.treasury.toLowerCase(),
                BigInt(
                    Math.max(Math.ceil(Number(provision) * 0.5 * portion.percent), Number(this.parameters.minimumFee))
                )
            )
        }

        if (params.royalty) {
            this.addToTreasuries(payToTreasuries, params.royalty.treasury.toLowerCase(), BigInt(Math.ceil(Number(params.amount) * params.royalty.percent)))
        }

        const buyRedeemer = Data.to(new Constr(0, [
            sellMarketPortions.map(portion =>
                new Constr(0,
                    [
                        BigInt(Math.ceil(portion.percent * 10_000)),
                        Data.from(portion.treasury)
                    ]
                ), // selling marketplace
            )]))

        let buildJam = await tx.spend(utxo, buyRedeemer)
        buildJam = buildJam.payTo(
            params.beneficier,
            { lovelace: params.amount - BigInt(provision) + utxo.assets.lovelace }
        )
        return await this.payToTreasuries(job, buildJam, this.treasury!, utxo, payToTreasuries, force)
    }
}

export class JobContractOffer extends JobContract {
    public parseDatum<OfferDatumV1>(job: JobCardano, datumString: string): OfferDatumV1 {
        const datum: Constr<any> = Data.from(datumString)

        const beneficier = parseAddress(job, datum.fields[0])
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
        } as OfferDatumV1

    }

    public async listTx(job: JobCardano, tx: Transaction, asset: WantedAsset, price: bigint, listingMarket?: string, listingAffiliate?: string, royalty?: Portion): Promise<Transaction> {
        if (typeof listingMarket == "undefined") {
            listingMarket = this.parameters.jobTreasury
        }

        const offererAddr = await job.getEncodedAddress()
        const datum = new Constr(0, [
            offererAddr,
            Data.from(listingMarket),
            listingAffiliate ? new Constr(0, [Data.from(listingAffiliate)]) : new Constr(1, []),
            price,
            encodeWantedAsset(asset),
            encodeRoyalty(royalty)
        ]);

        tx = tx.payTo(
            this.getAddress(job),
            {
                lovelace: job.minimumAdaAmount + price
            },
            Data.to(datum)
        )

        return tx
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<Transaction> {
        const params = this.parseDatum<OfferDatumV1>(job, utxo.datum!)
        const provision = 0.025 * Number(params.amount)

        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.parameters.jobTreasury, BigInt(Math.ceil(provision * 0.1)))

        this.addToTreasuries(payToTreasuries, params.listingMarketDatum.toLocaleLowerCase(), BigInt(Math.ceil(Number(provision) * 0.2)))
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum.toLowerCase(), BigInt(Math.ceil(Number(provision) * 0.2)))

        for (let portion of sellMarketPortions) {
            this.addToTreasuries(payToTreasuries, portion.treasury.toLowerCase(), BigInt(Math.ceil(Number(provision) * 0.5 * portion.percent)))
        }

        if (params.royalty) {
            this.addToTreasuries(payToTreasuries, params.royalty.treasury.toLowerCase(), BigInt(Math.ceil(Number(params.amount) * params.royalty.percent)))
        }

        const buyRedeemer = Data.to(new Constr(0, [
            sellMarketPortions.map(portion =>
                new Constr(0,
                    [
                        BigInt(Math.ceil(portion.percent * 10_000)),
                        Data.from(portion.treasury)
                    ]
                ), // selling marketplace
            )]))

        let buildTx = tx.spend(utxo, buyRedeemer)
        buildTx = buildTx.payTo(params.beneficier, {
            lovelace: utxo.assets.lovelace - params.amount,
            [unit]: 1n
        })
        return await this.payToTreasuries(job, buildTx, this.treasury!, utxo, payToTreasuries, force)
    }
}

export class JobContractTreasury extends JobContract {

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO): Promise<Transaction> {
        return tx.spend(utxo, Data.to(new Constr(0, [])))
    }
}