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

import { Constr, C, Data, fromText, fromHex, toHex, type Lucid, type OutRef, type Script, type ScriptType, type Tx, type Unit, type UTxO, Credential, TxSigned, Assets } from "lucid-cardano"
import type { SignParams, ReservationResponse, UtxosResponse, WithdrawResponse, ScriptStore } from "./definitions"
import { Lock } from "./definitions"
import { encodeTreasuryDatumTokens, encodeTreasuryDatumAddress, encodeAddress, encodeRoyalty, encodeWantedAsset } from "./common"
import { getContext } from "./data"
import { ContractType, type Contract } from "./cardano/contract"
import { Context } from "./cardano/context"
import { Transaction } from "./cardano/transaction"
import { InstantBuyDatumV1, OfferDatumV1, WantedAsset, Portion } from "./cardano/job"
import { JpgDatum } from "./cardano/jpg"
import { JamOnBreadProvider, ScriptResponse } from "./provider";

export type { SignParams, ReservationResponse, UtxosResponse, WithdrawResponse, ScriptStore } from "./definitions"
export { Context } from "./cardano/context"
export { Lock } from "./definitions"
export { encodeTreasuryDatumTokens, encodeTreasuryDatumAddress, encodeAddress, encodeRoyalty, encodeWantedAsset } from "./common"
export { ContractType, ContractBase, type Contract } from "./cardano/contract"
export { JamOnBreadProvider } from "./provider";
export type { InstantBuyDatumV1, OfferDatumV1, WantedAsset, Portion } from "./cardano/job"

function query(url: string, method: string, body?: any) {

    if (body) {
        body = JSON.stringify(body, (_, v) => typeof v === 'bigint' ? Number(v) : v)
    }

    return fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        method,
        body,
    })
}


export class JobCardano {
    readonly context: Context
    private jobApiUrl: string

    readonly treasuryDatum: string
    public signParams?: SignParams

    readonly lucid: Lucid
    readonly provider: JamOnBreadProvider
    readonly scripts: ScriptStore[] = []
    readonly minimumAdaAmount = 2_000_000n

    constructor(
        lucid: Lucid,
        jobApiUrl?: string,
        context?: Context,
    ) {
        this.lucid = lucid
        this.context = context ? context : getContext(lucid)
        this.jobApiUrl = jobApiUrl ? jobApiUrl : this.context.jobApiUrl
        this.provider = new JamOnBreadProvider(`${this.jobApiUrl}/lucid`)
        this.treasuryDatum = Data.to(encodeTreasuryDatumTokens(this.context.jobTokenPolicy, BigInt(this.context.numberOfToken)))
    }

    public newTx(tx?: Tx): Transaction {
        return new Transaction(this, tx)
    }

    public setSignParams(signParams: SignParams) {
        this.signParams = signParams
    }

    public addressToDatum(address: string): string {
        const credential = this.lucid.utils.paymentCredentialOf(address)
        const datum = encodeTreasuryDatumAddress(credential.hash)
        return Data.to(datum)
    }

    public tokenToDatum(policyId: string, minTokens: bigint): string {
        const datum = encodeTreasuryDatumTokens(policyId, minTokens)
        return Data.to(datum)
    }

    public async sign(payload?: string): Promise<SignParams> {
        payload = payload || String(Date.now())
        const address = await this.lucid.wallet.address()
        const message = await this.lucid.wallet.signMessage(address, fromText(payload))

        return {
            address,
            secret: payload,
            signature: message.signature,
            key: message.key
        }
    }

    public async payJoBToken(tx: Tx, amount?: bigint): Promise<Tx> {
        if (!amount) {
            amount = BigInt(this.context.numberOfToken)
        }

        return tx.payToAddress(
            await this.lucid.wallet.address(),
            {
                [this.context.jobTokenPolicy + this.context.jobTokenName]: amount
            }
        )
    }

    public async squashNft(): Promise<String> {
        const utxos = await this.lucid.wallet.getUtxos()
        const assets: Record<string, bigint> = {
            lovelace: 0n
        }
        for (let utxo of utxos) {
            for (let asset in utxo.assets) {
                if (asset in assets) {
                    assets[asset] += BigInt(utxo.assets[asset])
                } else {
                    assets[asset] = BigInt(utxo.assets[asset])
                }
            }
        }
        // Remove lovelace from assets
        assets.lovelace = 0n

        const tx = await this.lucid
            .newTx()
            .collectFrom(utxos)
            .payToAddress(await this.lucid.wallet.address(), assets)
            .complete()

        const signedTx = await tx
            .sign()
            .complete()

        const txHash = await signedTx.submit()

        return txHash
    }

    public async getEncodedAddress(address?: string) {
        if (!address)
            address = await this.lucid.wallet.address()

        const payCred = this.lucid.utils.paymentCredentialOf(address)
        try {
            const stakeCred = this.lucid.utils.stakeCredentialOf(address)
            return encodeAddress(payCred.hash, stakeCred!.hash)
        }
        catch (e) {
            return encodeAddress(payCred.hash)
        }
    }

    public getTreasuryAddress(stakeId?: number): string {
        return this.context.getContract(ContractType.JobTreasury).getAddress(this)
    }

    public getInstantBuyAddress(stakeId?: number): string {
        return this.context.getContract(ContractType.JobInstantBuy).getAddress(this)
    }

    public getOfferAddress(stakeId?: number): string {
        return this.context.getContract(ContractType.JobOffer).getAddress(this)
    }

    public async getScript(hash: string): Promise<ScriptStore> {
        // Find or create
        let script = this.scripts.find((s => s.hash == hash))
        if (typeof script === 'undefined') {
            const tmp = await this.provider.getScript(hash)
            script = {
                hash,
                script: {
                    script: tmp.hex,
                    type: tmp.kind,
                },
                outRef: tmp.outRef
            }
            this.scripts.push(script)
        }

        return script!
    }

    public async createTreasuryTx(tx: Transaction, unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Promise<Transaction> {

        const stakeNumber = this.context.getContract(ContractType.JobTreasury).getStakeNumber()
        const start = Math.floor(Math.random() * stakeNumber)
        const uniqueStakes: number[] = []

        // Set numbers to list
        for (let i = 0; i < unique; i++) {
            uniqueStakes.push((start + i * 13) % stakeNumber)
        }

        for (let i = 0; i < total; i++) {
            tx = await tx.payTo(this.getTreasuryAddress(uniqueStakes[i % uniqueStakes.length]), { lovelace: amount }, datum)
        }

        return tx
    }

    public async createTreasury(unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Promise<string> {
        let tx = this.newTx()
        tx = await this.createTreasuryTx(tx, unique, total, datum, amount)
        return await this.finishTx(await tx.lucid())
    }

    public async createTreasuryAddress(address: string, unique: number, total: number, amount: bigint = 2000_000n): Promise<string> {
        const credential = this.lucid.utils.paymentCredentialOf(address)
        const datum = encodeTreasuryDatumAddress(credential.hash)

        return await this.createTreasury(unique, total, Data.to(datum), amount)
    }

    public async createTreasuryToken(policyId: string, minTokens: bigint, unique: number, total: number, data: string, amount: bigint = 2_000_000n): Promise<string> {
        const datum = encodeTreasuryDatumTokens(policyId, minTokens)

        return await this.createTreasury(unique, total, Data.to(datum), amount)
    }

    public async getTreasuriesReserve(utxo: OutRef, affiliates: string[], force: boolean): Promise<ReservationResponse> {
        const url = `${this.jobApiUrl}/treasury/reserve`
        const body = {
            utxo,
            affiliates,
            force
        }

        const response = await query(url, 'POST', body)
        return await response.json() as ReservationResponse
    }

    public async getTreasuryUtxos(plutus: string): Promise<UtxosResponse> {
        const url = `${this.jobApiUrl}/treasury/utxos/${plutus}`
        const response = await query(url, 'GET')

        return await response.json() as UtxosResponse
    }

    public async getTreasuryWithdraw(plutus: string, signParams?: SignParams): Promise<WithdrawResponse> {
        const url = `${this.jobApiUrl}/treasury/withdraw`
        const body = {
            plutus,
            params: signParams || this.signParams || await this.sign()
        }
        const response = await query(url, 'POST', body)

        return await response.json() as WithdrawResponse
    }

    public getAffiliates(utxo: UTxO, treasuries: Portion[]): string[] {
        let affiliates: string[] = treasuries.map(treasury => treasury.treasury)

        // Instant buy
        const contract = this.context.getContractByAddress(utxo.address)

        if (contract.type == ContractType.JobInstantBuy) {
            const datum = contract.parseDatum<InstantBuyDatumV1>(this, utxo.datum!)
            affiliates.push(datum.listingMarketDatum)
            if (datum.listingAffiliateDatum) {
                affiliates.push(datum.listingAffiliateDatum)
            }
            if (datum.royalty) {
                affiliates.push(datum.royalty.treasury)
            }
            return affiliates
        }

        // Offer
        if (contract.type == ContractType.JobOffer) {
            const datum = contract.parseDatum<OfferDatumV1>(this, utxo.datum!)
            affiliates.push(datum.listingMarketDatum)
            if (datum.listingAffiliateDatum) {
                affiliates.push(datum.listingAffiliateDatum)
            }
            if (datum.royalty) {
                affiliates.push(datum.royalty.treasury)
            }
            return affiliates
        }

        return affiliates
    }

    public async lockContractUtxo(utxo: UTxO, ...treasuries: Portion[]): Promise<Lock> {
        try {
            const affiliates = this.getAffiliates(utxo, treasuries)
            const result = await this.getTreasuriesReserve(utxo, affiliates, false)

            if (result.all) {
                return Lock.Locked
            } if (result.utxos.size > 0) {
                return Lock.Partial
            }

            return Lock.Blocked
        } catch (e) {
            console.error(e)
            return Lock.Error
        }
    }

    public async lockContractRef(ref: OutRef, ...treasuries: Portion[]): Promise<Lock> {
        try {
            const [utxo] = await this.lucid.utxosByOutRef([ref])
            return await this.lockContractUtxo(utxo, ...treasuries)
        }
        catch (e) {
            console.error(e)
            return Lock.Error
        }
    }

    public async lockContractUnit(unit: Unit, ...treasuries: Portion[]): Promise<Lock> {
        try {
            const utxo = await this.lucid.utxoByUnit(unit)
            return await this.lockContractUtxo(utxo, ...treasuries)

        } catch (e) {
            console.error(e)
            return Lock.Error
        }
    }

    public async withdrawTreasuryTx(tx: Tx, utxos: OutRef[], datum: string, reduce: boolean = false): Promise<Tx> {
        const treasuries: Map<string, bigint> = new Map()
        const collectFrom = await this.lucid.utxosByOutRef(utxos)
        let transaction = new Transaction(this, tx)

        for (let utxo of collectFrom) {
            if (utxo.datum! == datum) {
                const contract = this.context.getContractByAddress(utxo.address)

                transaction = await contract.cancelTx(this, transaction, utxo)
                treasuries.set(utxo.address, (treasuries.get(utxo.address) || 0n) + utxo.assets.lovelace)

                if (!reduce) {
                    tx.payToContract(utxo.address, { inline: utxo.datum! }, { lovelace: this.minimumAdaAmount })
                }
            }
        }

        if (reduce) {
            for (let address of treasuries.keys()) {
                tx.payToContract(address, { inline: datum }, { lovelace: this.minimumAdaAmount })
            }
        }
        return tx
    }

    async withdrawTreasuryRaw(utxos: OutRef[], datum: string, reduce: boolean = false): Promise<string> {
        let tx = this.lucid.newTx()
        tx = await this.withdrawTreasuryTx(tx, utxos, datum, reduce)
        tx = tx.addSigner(await this.lucid.wallet.address())
        return await this.finishTx(tx)
    }

    async withdrawTreasury(plutus: string, reduce: boolean = false, signParams?: SignParams): Promise<string> {
        const treasuries = await this.getTreasuryWithdraw(plutus, signParams)
        return await this.withdrawTreasuryRaw(treasuries.utxos, plutus, reduce)
    }



    public async instantBuyListTx(tx: Transaction, unit: Unit, price: bigint, listingMarket?: string, listingAffiliate?: string, royalty?: Portion): Promise<Transaction> {
        if (typeof listingMarket == "undefined") {
            listingMarket = this.treasuryDatum
        }

        const contract = this.context.getContract(ContractType.JobInstantBuy)
        return await contract.listTx(this, tx, unit, price, listingMarket, listingAffiliate, royalty)
    }

    public async instantBuyList(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txList = this.newTx()
        txList = await this.instantBuyListTx(txList, unit, price, listing, affiliate, royalty)

        return await this.finishTx(await txList.lucid())
    }

    public async instantBuyCancelTx(tx: Transaction, outRef: UTxO | OutRef): Promise<Transaction> {
        const [utxo] = await this.lucid.utxosByOutRef([outRef])
        const contract = this.context.getContractByAddress(utxo.address)
        console.log(contract)
        return contract.cancelTx(this, tx, utxo)
    }

    public async instantBuyCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.newTx()
        txCancel = await this.instantBuyCancelTx(txCancel, utxo)
        return await this.finishTx(await txCancel.lucid())
    }

    public async instantBuyUpdateTx(tx: Transaction, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Transaction> {
        const toSpend = await this.lucid.utxoByUnit(unit)
        tx = await this.instantBuyCancelTx(tx, {
            txHash: toSpend.txHash,
            outputIndex: toSpend.outputIndex
        })
        tx = await this.instantBuyListTx(tx, unit, price, listing, affiliate, royalty)
        return tx
    }

    public async instantBuyUpdate(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.newTx()
        txUpdate = await this.instantBuyUpdateTx(txUpdate, unit, price, listing, affiliate, royalty)
        return await this.finishTx(await txUpdate.lucid())
    }

    public async instantBuyProceedTx(tx: Transaction, outRef: OutRef, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<Transaction> {
        const [utxo] = await this.lucid.utxosByOutRef([outRef])
        const contract = this.context.getContractByAddress(utxo.address)
        return contract.processTx(this, tx, utxo, force, ...sellMarketPortions)
    }

    public async instantBuyProceed(utxo: OutRef, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {
        console.log("Inside instant buy")
        let buildTx = this.newTx()
        buildTx = await this.instantBuyProceedTx(buildTx, utxo, force, ...sellMarketPortions)
        return await this.finishTx(await buildTx.lucid())
    }

    public async offerListTx(tx: Transaction, asset: WantedAsset, price: bigint, listingMarket?: string, listingAffiliate?: string, royalty?: Portion): Promise<Transaction> {
        if (typeof listingMarket == "undefined") {
            listingMarket = this.treasuryDatum
        }
        const contract = this.context.getContract(ContractType.JobOffer)
        return await contract.listTx(this, tx, asset, price, listingMarket, listingAffiliate, royalty)
    }

    public async offerList(asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txList = this.newTx()
        txList = await this.offerListTx(txList, asset, price, listing, affiliate, royalty)
        return this.finishTx(await txList.lucid())
    }

    public async offerCancelTx(tx: Transaction, utxo: UTxO | OutRef): Promise<Transaction> {
        const [toSpend] = await this.lucid.utxosByOutRef([utxo])
        const contract = await this.context.getContractByAddress(toSpend.address)
        return await contract.cancelTx(this, tx, toSpend)
    }

    public async offerCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.newTx()
        txCancel = await this.offerCancelTx(txCancel, utxo)
        return await this.finishTx(await txCancel.lucid())
    }

    public async offerUpdateTx(tx: Transaction, utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Transaction> {
        tx = await this.offerCancelTx(tx, utxo)
        return await this.offerListTx(tx, asset, price, listing, affiliate, royalty)
    }

    public async offerUpdate(utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.newTx()
        txUpdate = await this.offerUpdateTx(txUpdate, utxo, asset, price, listing, affiliate, royalty)
        return await this.finishTx(await txUpdate.lucid())
    }

    public async offerProceedTx(tx: Transaction, outRef: OutRef, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<Transaction> {
        const [utxo] = await this.lucid.utxosByOutRef([outRef])
        const contract = await this.context.getContractByAddress(utxo.address)
        return await contract.processTx(this, tx, utxo, unit, force, ...sellMarketPortions)
    }

    public async offerProceed(utxo: OutRef, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {
        let buildTx = this.newTx()
        buildTx = await this.offerProceedTx(buildTx, utxo, unit, force, ...sellMarketPortions)
        return await this.finishTx(await buildTx.lucid())
    }

    public registerStakeTx(tx: Tx, stake: string): Tx {
        let newTx = tx.registerStake(stake)
        return newTx
    }

    public async registerStakes(stakes: string[]): Promise<string> {
        let newTx = this.lucid.newTx()
        for (let stake of stakes) {
            newTx = newTx.registerStake(stake)
        }
        newTx = await this.addJobTokens(newTx)
        return await this.finishTx(newTx)
    }

    public delegateTx(tx: Tx, stake: string, poolId: string): Tx {
        const credential = this.lucid.utils.scriptHashToCredential(stake)
        const rewardAddress = this.lucid.utils.credentialToRewardAddress(credential)
        let newTx = tx.delegateTo(rewardAddress, poolId, Data.void())
        return newTx
    }

    public async delegate(stake: string, poolId: string): Promise<string> {
        let newTx = this.lucid.newTx()
        /*
        newTx = this.delegateTx(newTx, stake, poolId)
        newTx = await this.addJobTokens(newTx)
        newTx = await this.context.getContractByHash(stake).attachTx(this.lucid, newTx)
        */
        return await this.finishTx(newTx)
    }

    public withdrawTx(tx: Tx, stake: string, amount: bigint): Tx {
        const credential = this.lucid.utils.scriptHashToCredential(stake)
        const rewardAddress = this.lucid.utils.credentialToRewardAddress(credential)
        let newTx = tx.withdraw(rewardAddress, amount, Data.void())
        return newTx
    }

    public async withdraw(stake: string, amount: bigint): Promise<string> {
        let newTx = this.lucid.newTx()
        /*
        newTx = this.withdrawTx(newTx, stake, amount)
        newTx = await this.addJobTokens(newTx)
        newTx = await this.context.getContractByHash(stake).attachTx(this.lucid, newTx)
        */
        return await this.finishTx(newTx)
    }

    public async addJobTokens(tx: Tx, assets?: Assets): Promise<Tx> {
        if (typeof assets === 'undefined') {
            assets = { [this.context.jobTokenPolicy + this.context.jobTokenName]: BigInt(this.context.numberOfToken) }
        }
        return tx.payToAddress(
            await this.lucid.wallet.address(),
            assets
        )
    }

    public async finishTx(tx: Tx): Promise<string> {
        const txComplete = await tx.complete()
        const signedTx = await txComplete.sign().complete()
        const cbor = await signedTx.toString()
        const txHash = await this.provider.submitTx(cbor)
        return txHash
    }

    public async awaitTx(txHash: string): Promise<boolean> {
        console.debug(`Waiting for transaction: ${txHash}`)
        return await this.provider.awaitTx(txHash)
    }
}
