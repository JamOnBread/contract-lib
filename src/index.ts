import { Constr, Data, fromText, type Lucid, type OutRef, type Tx, type Unit, type UTxO } from "lucid-cardano"
import type { Portion, WantedAsset, SignParams, ReservationResponse, UtxosResponse, WithdrawResponse } from "./definitions"
import { Lock } from "./definitions"
import { encodeTreasuryDatumTokens, encodeTreasuryDatumAddress, encodeAddress, encodeRoyalty, encodeWantedAsset } from "./common"
import { getContext } from "./data"
import { Context, ContractType, type Contract } from "./context"

export type { Portion, WantedAsset, InstantBuyDatumV1, OfferDatumV1, SignParams, ReservationResponse, UtxosResponse, WithdrawResponse } from "./definitions"
export { Lock } from "./definitions"
export { encodeTreasuryDatumTokens, encodeTreasuryDatumAddress, encodeAddress, encodeRoyalty, encodeWantedAsset } from "./common"
export { Context, ContractType, ContractBase, type Contract } from "./context"

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

    readonly lucid: Lucid


    constructor(
        lucid: Lucid,
        jobApiUrl?: string,
        context?: Context,
    ) {
        this.lucid = lucid
        this.context = context ? context : getContext(lucid)
        this.jobApiUrl = jobApiUrl ? jobApiUrl : this.context.jobApiUrl

        this.treasuryDatum = Data.to(encodeTreasuryDatumTokens(this.context.jobTokenPolicy, BigInt(this.context.numberOfToken)))
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

    public async sign(payload: string): Promise<SignParams> {
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

    public async squashNft(): Promise<OutRef> {
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
        assets.lovelace -= 2_000_000n

        const tx = await this.lucid
            .newTx()
            .collectFrom(utxos)
            .payToAddress(await this.lucid.wallet.address(), assets)
            .complete()

        const signedTx = await tx
            .sign()
            .complete()

        const txHash = await signedTx.submit();

        return {
            txHash,
            outputIndex: 0
        }
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
        return this.context.getContractAddress(this.lucid, this.context.getContract(ContractType.JobTreasury), stakeId)
    }

    public getInstantBuyAddress(stakeId?: number): string {
        return this.context.getContractAddress(this.lucid, this.context.getContract(ContractType.JobInstantBuy), stakeId)
    }

    public getOfferAddress(stakeId?: number): string {
        return this.context.getContractAddress(this.lucid, this.context.getContract(ContractType.JobOffer), stakeId)
    }

    public createTreasuryTx(tx: Tx, unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Tx {

        const stakeNumber = this.context.getStakeNumber()
        const start = Math.floor(Math.random() * stakeNumber)
        const uniqueStakes: number[] = []

        // Set numbers to list
        for (let i = 0; i < unique; i++) {
            uniqueStakes.push((start + i * 13) % stakeNumber)
        }

        for (let i = 0; i < total; i++) {
            tx = tx.payToContract(
                this.getTreasuryAddress(uniqueStakes[i % uniqueStakes.length]),
                { inline: datum },
                { lovelace: amount }
            )
        }

        return tx
    }

    public async createTreasury(unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Promise<string> {
        let tx = this.lucid.newTx()
        tx = this.createTreasuryTx(tx, unique, total, datum, amount)

        return await this.finishTx(tx)
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
        const url = `${this.jobApiUrl}treasury/reserve`
        const body = {
            utxo,
            affiliates,
            force
        }

        const response = await query(url, 'POST', body)
        return await response.json() as ReservationResponse
    }

    public async getTreasuryUtxos(plutus: string): Promise<UtxosResponse> {
        const url = `${this.jobApiUrl}treasury/utxos/${plutus}`
        const response = await query(url, 'GET')

        return await response.json() as UtxosResponse
    }

    public async getTreasuryWithdraw(plutus: string): Promise<WithdrawResponse> {
        const url = `${this.jobApiUrl}treasury/withdraw`
        const body = {
            plutus,
            params: await this.sign(String(Date.now()))
        }
        const response = await query(url, 'POST', body)

        return await response.json() as WithdrawResponse
    }

    public getAffiliates(utxo: UTxO, treasuries: Portion[]): string[] {
        let affiliates: string[] = treasuries.map(treasury => treasury.treasury)

        // Instant buy
        const contract = this.context.getContractByAddress(utxo.address)

        if (contract.type == ContractType.JobInstantBuy) {
            const datum = contract.parseDatum(this.lucid, utxo.datum!)
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
            const datum = contract.parseDatum(this.lucid, utxo.datum!)
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

        for (let utxo of collectFrom) {
            if (utxo.datum! == datum) {
                const contract = this.context.getContractByAddress(utxo.address)

                tx = await contract.collectTx(this.lucid, tx, utxo, Data.to(new Constr(1, [])))
                treasuries.set(utxo.address, (treasuries.get(utxo.address) || 0n) + utxo.assets.lovelace)

                if (!reduce) {
                    tx.payToContract(utxo.address, { inline: utxo.datum! }, { lovelace: this.context.minimumAdaAmount })
                }
            }
        }

        if (reduce) {
            for (let address of treasuries.keys()) {
                tx.payToContract(address, { inline: datum }, { lovelace: this.context.minimumAdaAmount })
            }
        }

        // tx = tx.attachSpendingValidator(this.treasuryScript)
        return tx
    }

    async withdrawTreasuryRaw(utxos: OutRef[], datum: string, reduce: boolean = false): Promise<string> {
        let tx = this.lucid.newTx()
        tx = await this.withdrawTreasuryTx(tx, utxos, datum, reduce)
        tx = tx.addSigner(await this.lucid.wallet.address())
        return await this.finishTx(tx)
    }

    async withdrawTreasury(plutus: string, reduce: boolean = false): Promise<string> {
        const treasuries = await this.getTreasuryWithdraw(plutus)
        return await this.withdrawTreasuryRaw(treasuries.utxos, plutus, reduce)
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

    async payToTreasuries(tx: Tx, contract: Contract, utxo: OutRef, payToTreasuries: Map<string, bigint>, force: boolean): Promise<Tx> {
        // JoB treasury
        const treasuryRequest = await this.getTreasuriesReserve(utxo, Array.from(payToTreasuries.keys()), force)

        if (!treasuryRequest.all && !force) {
            throw new Error('Treasuries are not avaible')
        }
        const allTreasuries = await this.lucid.utxosByOutRef(Object.values(treasuryRequest.utxos))

        // Pay to treasuries
        for (let [datum, _] of payToTreasuries) {
            const treasury = this.getTreasury(allTreasuries, datum)
            // Treasury exists
            if (treasury) {
                const contract = await this.context.getContractByAddress(treasury.address)
                tx = await contract.collectTx(this.lucid, tx, treasury, Data.void())

                tx = tx.payToContract(
                    treasury.address,
                    { inline: datum },
                    { lovelace: BigInt(treasury.assets.lovelace) + BigInt(Math.max(Number(this.context.minimumFee), Number(payToTreasuries.get(datum)!))) }
                )
            }
            // There is no free treasury
            else {
                tx = tx.payToContract(
                    this.context.getContractAddress(this.lucid, contract),
                    { inline: datum },
                    { lovelace: BigInt(Math.max(Number(payToTreasuries.get(datum)!), Number(this.context.minimumAdaAmount))) }
                )
            }
        }
        return tx
    }

    public async instantBuyListTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        if (typeof listing == "undefined") {
            listing = this.treasuryDatum
        }

        const sellerAddr = await this.getEncodedAddress()
        const datum = new Constr(0, [
            sellerAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            encodeRoyalty(royalty)
        ]);

        tx = tx.payToContract(
            this.getInstantBuyAddress(),
            { inline: Data.to(datum) },
            {
                [unit]: BigInt(1),
                lovelace: this.context.minimumAdaAmount
            }
        )

        return tx
    }

    public async instantbuyList(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txList = this.lucid.newTx()
        txList = await this.instantBuyListTx(txList, unit, price, listing, affiliate, royalty)

        return await this.finishTx(txList)
    }

    public async instantBuyCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx> {
        const [toSpend] = await this.lucid.utxosByOutRef([utxo])
        try {
            const contract = await this.context.getContractByAddress(toSpend.address)
            tx = await contract.collectTx(this.lucid, tx, toSpend, Data.to(new Constr(1, [])))
            tx = tx.addSigner(await this.lucid.wallet.address())
        } catch (e) {
            tx = tx.collectFrom([toSpend])
        }

        return tx
    }

    public async instantBuyCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.lucid.newTx()
        txCancel = await this.instantBuyCancelTx(txCancel, utxo)
        return await this.finishTx(txCancel)
    }

    public async instantBuyUpdateTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        const toSpend = await this.lucid.utxoByUnit(unit)
        tx = await this.instantBuyCancelTx(tx, {
            txHash: toSpend.txHash,
            outputIndex: toSpend.outputIndex
        })
        tx = await this.instantBuyListTx(tx, unit, price, listing, affiliate, royalty)
        return tx
    }

    public async instantBuyUpdate(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.lucid.newTx()
        txUpdate = await this.instantBuyUpdateTx(txUpdate, unit, price, listing, affiliate, royalty)
        return await this.finishTx(txUpdate)
    }

    public async instantBuyProceedTx(tx: Tx, utxo: OutRef, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<Tx> {

        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ])
        const contract = await this.context.getContractByAddress(collectUtxo.address)
        const params = contract.parseDatum(this.lucid, collectUtxo.datum!)
        const provision = 0.025 * Number(params.amount)
        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.treasuryDatum, BigInt(Math.max(Math.ceil(provision * 0.1), Number(this.context.minimumJobFee))))

        this.addToTreasuries(payToTreasuries, params.listingMarketDatum, BigInt(Math.ceil(Number(provision) * 0.2)))
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum, BigInt(Math.ceil(Number(provision) * 0.2)))

        for (let portion of sellMarketPortions) {
            this.addToTreasuries(
                payToTreasuries,
                portion.treasury.toLowerCase(),
                BigInt(
                    Math.max(Math.ceil(Number(provision) * 0.5 * portion.percent), Number(this.context.minimumFee))
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

        let buildTx = await contract.collectTx(this.lucid, tx, collectUtxo, buyRedeemer)
        buildTx = buildTx.payToAddress(
            params.beneficier,
            { lovelace: params.amount + collectUtxo.assets.lovelace }
        )
        return await this.payToTreasuries(buildTx, contract.treasury!, utxo, payToTreasuries, force)
    }

    public async instantBuyProceed(utxo: OutRef, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {
        let buildTx = this.lucid.newTx()
        buildTx = await this.instantBuyProceedTx(buildTx, utxo, force, ...sellMarketPortions)
        return await this.finishTx(buildTx)
    }

    public async offerListTx(tx: Tx, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        if (typeof listing == "undefined") {
            listing = this.treasuryDatum
        }

        const offererAddr = await this.getEncodedAddress()
        const datum = new Constr(0, [
            offererAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            encodeWantedAsset(asset),
            encodeRoyalty(royalty)
        ]);

        tx = tx.payToContract(
            this.getOfferAddress(),
            { inline: Data.to(datum) },
            {
                lovelace: this.context.minimumAdaAmount + price
            }
        )

        return tx
    }

    public async offerList(asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txList = this.lucid.newTx()
        txList = await this.offerListTx(txList, asset, price, listing, affiliate, royalty)

        return this.finishTx(txList)
    }

    public async offerCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx> {
        const [toSpend] = await this.lucid.utxosByOutRef([utxo])
        const contract = await this.context.getContractByAddress(toSpend.address)
        tx = await contract.collectTx(this.lucid, tx, toSpend, Data.to(new Constr(1, [])))
        return tx.addSigner(await this.lucid.wallet.address())
    }

    public async offerCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.lucid.newTx()
        txCancel = await this.offerCancelTx(txCancel, utxo)
        return await this.finishTx(txCancel)
    }

    public async offerUpdateTx(tx: Tx, utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        tx = await this.offerCancelTx(tx, utxo)
        tx = await this.offerListTx(tx, asset, price, listing, affiliate, royalty)
        return tx
    }

    public async offerUpdate(utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.lucid.newTx()
        txUpdate = await this.offerUpdateTx(txUpdate, utxo, asset, price, listing, affiliate, royalty)
        return await this.finishTx(txUpdate)
    }

    public async offerProceedTx(tx: Tx, utxo: OutRef, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<Tx> {

        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ])

        const contract = await this.context.getContractByAddress(collectUtxo.address)
        const params = contract.parseDatum(this.lucid, collectUtxo.datum!)
        const provision = 0.025 * Number(params.amount)

        console.debug("Offer", params)
        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.treasuryDatum, BigInt(Math.max(Math.ceil(provision * 0.1), Number(this.context.minimumJobFee))))

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

        let buildTx = await contract.collectTx(this.lucid, tx, collectUtxo, buyRedeemer)
        buildTx = buildTx.payToAddress(
            params.beneficier,
            {
                lovelace: this.context.minimumAdaAmount,
                [unit]: 1n
            }
        )
        return await this.payToTreasuries(buildTx, contract.treasury!, utxo, payToTreasuries, force)
    }

    public async offerProceed(utxo: OutRef, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {
        let buildTx = this.lucid.newTx()
        buildTx = await this.offerProceedTx(buildTx, utxo, unit, force, ...sellMarketPortions)
        return await this.finishTx(buildTx)
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
        newTx = this.delegateTx(newTx, stake, poolId)
        newTx = await this.addJobTokens(newTx)
        newTx = await this.context.getContractByHash(stake).attachTx(this.lucid, newTx)
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
        newTx = this.withdrawTx(newTx, stake, amount)
        newTx = await this.addJobTokens(newTx)
        newTx = await this.context.getContractByHash(stake).attachTx(this.lucid, newTx)
        return await this.finishTx(newTx)
    }

    public async addJobTokens(tx: Tx): Promise<Tx> {
        return tx.payToAddress(
            await this.lucid.wallet.address(),
            { [this.context.jobTokenPolicy + this.context.jobTokenName]: BigInt(this.context.numberOfToken) }
        )
    }

    public async finishTx(tx: Tx): Promise<string> {
        const txComplete = await tx.complete()
        const signedTx = await txComplete.sign().complete()
        const txHash = await signedTx.submit()

        return txHash
    }

}
