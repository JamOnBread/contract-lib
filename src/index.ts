import { Lucid, Script, Constr, Data, PolicyId, Unit, fromText, Tx, UTxO, OutRef, Credential, applyParamsToScript } from "lucid-cardano"
import { plutus } from "./plutus"

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

export type SignParams = {
    address: string,
    secret: string,
    signature: string,
    key: string
}

export type ReservationResponse = {
    all: boolean,
    blocked: boolean,
    expiration: number,
    utxos: Map<string, OutRef>
}

export type UtxosResponse = {
    utxos: OutRef[]
}

export type WithdrawResponse = {
    utxos: OutRef[],
    expiration: number
}

export function version(): string {
    return plutus.preamble.version
}

export function getValidator(title: string): any {
    for (const validator of plutus.validators) {
        if (validator.title == title) {
            return validator
        }
    }
}

export function getCompiledCode(title: string): Script {
    return {
        type: "PlutusV2",
        script: getValidator(title).compiledCode
    }
}

export function applyCodeParamas(code: Script, params: any): Script {
    return {
        type: "PlutusV2",
        script: applyParamsToScript(
            code.script,
            params
        )
    }
}

export function getCompiledCodeParams(title: string, params: any): Script {
    return applyCodeParamas(getCompiledCode(title), params)
}


export function getRewardAddress(lucid: Lucid, stake: string): string {
    return lucid.utils.credentialToRewardAddress(
        lucid.utils.scriptHashToCredential(stake)
    )
}

export function encodeAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
): Constr<Data> {
    const paymentCredential = new Constr(0, [paymentPubKeyHex])

    const stakingCredential = stakingPubKeyHex
        ? new Constr(0, [new Constr(0, [new Constr(0, [stakingPubKeyHex])])])
        : new Constr(1, [])

    return new Constr(0, [paymentCredential, stakingCredential])
}

export function encodeTreasuryDatumAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
): Constr<Data> {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex)
    return new Constr(0, [address])
}


export const encodeTreasuryDatumTokens = (
    currencySymbol: string,
    minTokens: bigint
): Constr<Data> => {
    return new Constr(1, [new Constr(0, [currencySymbol, minTokens])]);
};

export function encodeRoyalty(portion?: Portion): Constr<Data> {
    return portion
        ? new Constr(0, [new Constr(0, [BigInt(portion.percent * 10_000), Data.from(portion.treasury)])])
        : new Constr(1, []);
}


export function encodeWantedAsset(wantedAsset: WantedAsset): Constr<Data> {
    return wantedAsset.assetName ?
        new Constr(0, [new Constr(0, [wantedAsset.policyId, wantedAsset.assetName])]) :
        new Constr(1, [wantedAsset.policyId])
}

function query(url: string, method: string, body: any) {

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

/**
 * Mint new unique asset
 *
 * @param lucid
 * @param name
 * @param amount
 * @returns transaction hash
 */
export async function mintUniqueAsset(lucid: Lucid, name: string, amount: bigint): Promise<string> {
    // Transform token name to hexa
    const tokenName = fromText(name)
    // Get first UTxO on wallet
    const [utxo, ...rest] = await lucid.utxosAt(await lucid.wallet.address())
    // Encode UTxO to transaction
    const param = new Constr(0, [new Constr(0, [utxo.txHash]), BigInt(utxo.outputIndex)])
    // Compile code with UTxO
    const policy = getCompiledCodeParams("assets.mint_v1", [param])
    // Hash script
    const policyId: PolicyId = lucid.utils.mintingPolicyToId(policy)
    // Calculate unit name
    const unit: Unit = policyId + tokenName;

    // Construct transaction
    const tx = await lucid
        .newTx()
        .collectFrom([utxo])
        .mintAssets(
            { [unit]: BigInt(amount) },
            Data.void()
        )
        .attachMintingPolicy(policy)

        .complete();

    // Sign & Submit transaction
    const signedTx = await tx.sign().complete()
    const txHash = await signedTx.submit()
    await lucid.awaitTx(txHash)

    // Return transaction hash (awaited)
    return txHash
}


export class JamOnBreadAdminV1 {
    private static treasuryScriptTitle: string = "treasury.spend_v1"
    private static instantBuyScriptTitle: string = "instant_buy.spend_v1"
    private static offerScriptTitle: string = "offer.spend_v1"
    private static stakingScriptTitle: string = "staking.withdrawal_v1"

    private jobApiUrl: string

    readonly numberOfStakes: bigint = 10n
    readonly numberOfToken: bigint = 1n

    readonly minimumAdaAmount: bigint = 2_000_000n
    readonly minimumJobFee: bigint = 100_000n
    readonly minimumFee = 20_000n

    readonly jamTokenPolicy: string
    readonly jamTokenName: string
    readonly jamStakes: Map<string, Script>
    readonly lucid: Lucid


    readonly treasuryScript: Script
    readonly instantBuyScript: Script
    readonly offerScript: Script

    readonly treasuryDatum: string

    public static getTreasuryScript(): Script {
        return getCompiledCode(JamOnBreadAdminV1.treasuryScriptTitle)
    }


    public static getJamStakes(lucid: Lucid, policyId: PolicyId, amount: bigint, number: bigint): Map<string, Script> {
        const stakes: Map<string, Script> = new Map()

        for (let i = 1n; i <= number; i++) {
            const code = getCompiledCodeParams(
                JamOnBreadAdminV1.stakingScriptTitle,
                [encodeTreasuryDatumTokens(policyId, amount), BigInt(i)]
            )

            stakes.set(lucid.utils.validatorToScriptHash(code), code)
        }

        return stakes
    }

    constructor(
        lucid: Lucid,
        jobApiUrl: string,
        jamTokenPolicy?: string,
        jamTokenName?: string,
    ) {
        this.lucid = lucid
        this.jobApiUrl = jobApiUrl
        this.jamTokenPolicy = jamTokenPolicy || '74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a'
        this.jamTokenName = jamTokenName || '556e69717565'
        this.jamStakes = JamOnBreadAdminV1.getJamStakes(
            lucid,
            this.jamTokenPolicy,
            this.numberOfToken,
            this.numberOfStakes
        )

        this.treasuryScript = JamOnBreadAdminV1.getTreasuryScript()
        this.instantBuyScript = applyCodeParamas(
            this.getInstantBuyScript(),
            [
                this.lucid.utils.validatorToScriptHash(this.treasuryScript),
                Array.from(
                    Array.from(this.jamStakes.keys()).map(stakeHash => new Constr(0, [new Constr(1, [stakeHash])]))
                ),
                this.createJobToken()
            ]
        )
        this.offerScript = applyCodeParamas(
            this.getOfferScript(),
            [
                this.lucid.utils.validatorToScriptHash(this.treasuryScript),
                Array.from(
                    Array.from(this.jamStakes.keys()).map(stakeHash => new Constr(0, [new Constr(1, [stakeHash])]))
                ),
                this.createJobToken()
            ]
        )

        this.treasuryDatum = Data.to(this.createJobToken())
    }

    public createJobToken(): Data {
        return encodeTreasuryDatumTokens(this.jamTokenPolicy, this.numberOfToken)
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

    async sign(payload: string): Promise<SignParams> {
        const address = await this.lucid.wallet.address()
        const message = await this.lucid.wallet.signMessage(address, fromText(payload))

        return {
            address,
            secret: payload,
            signature: message.signature,
            key: message.key
        }
    }

    async payJoBToken(tx: Tx, amount: bigint): Promise<Tx> {
        return tx.payToAddress(
            await this.lucid.wallet.address(),
            {
                [this.jamTokenPolicy + this.jamTokenName]: amount
            }
        )
    }

    async squashNft(): Promise<OutRef> {
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

    public getInstantBuyScript(): Script {
        return getCompiledCode(JamOnBreadAdminV1.instantBuyScriptTitle)
    }

    public getOfferScript(): Script {
        return getCompiledCode(JamOnBreadAdminV1.offerScriptTitle)
    }

    getTreasuryAddress(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.size)

        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.treasuryScript)
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: Array.from(this.jamStakes.keys())[stakeId]
        } as Credential

        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    async getEncodedAddress() {
        const address = await this.lucid.wallet.address()
        const payCred = this.lucid.utils.paymentCredentialOf(address)
        try {
            const stakeCred = this.lucid.utils.stakeCredentialOf(address)
            return encodeAddress(payCred.hash, stakeCred!.hash)
        }
        catch (e) {
            return encodeAddress(payCred.hash)
        }
    }

    getInstantBuyAddress(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.size)

        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.instantBuyScript)
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: Array.from(this.jamStakes.keys())[stakeId]
        } as Credential

        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    getOfferAddress(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.size)

        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.offerScript)
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: Array.from(this.jamStakes.keys())[stakeId]
        } as Credential

        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    createTreasuryTx(tx: Tx, unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Tx {
        const start = Math.floor(Math.random() * this.jamStakes.size)
        const uniqueStakes: number[] = []

        // Set numbers to list
        for (let i = 0; i < unique; i++) {
            uniqueStakes.push((start + i * 13) % this.jamStakes.size)
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

    async createTreasury(unique: number, total: number, datum: string, amount: bigint = 2_000_000n): Promise<string> {
        let tx = this.lucid.newTx()
        tx = this.createTreasuryTx(tx, unique, total, datum, amount)

        return await this.finishTx(tx)
    }

    async createTreasuryAddress(address: string, unique: number, total: number, amount: bigint = 2000_000n): Promise<string> {
        const credential = this.lucid.utils.paymentCredentialOf(address)
        const datum = encodeTreasuryDatumAddress(credential.hash)

        return await this.createTreasury(unique, total, Data.to(datum), amount)
    }

    async createTreasuryToken(policyId: string, minTokens: bigint, unique: number, total: number, data: string, amount: bigint = 2_000_000n): Promise<string> {
        const datum = encodeTreasuryDatumTokens(policyId, minTokens)

        return await this.createTreasury(unique, total, Data.to(datum), amount)
    }

    async withdrawTreasuryTx(tx: Tx, utxos: OutRef[], datum: string, reduce: boolean = false): Promise<Tx> {
        const treasuries: Map<string, bigint> = new Map()
        const collectFrom = await this.lucid.utxosByOutRef(utxos)

        for (let utxo of collectFrom) {
            if (utxo.datum! == datum) {
                tx.collectFrom([utxo], Data.to(new Constr(1, [])))
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

        tx = tx.attachSpendingValidator(this.treasuryScript)
        return tx
    }

    async withdrawTreasury(utxos: OutRef[], datum: string, reduce: boolean = false): Promise<string> {
        let tx = this.lucid.newTx()
        tx = await this.withdrawTreasuryTx(tx, utxos, datum, reduce)
        tx = tx.addSigner(await this.lucid.wallet.address())
        return await this.finishTx(tx)
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

    async getTreasuryUtxos(plutus: string): Promise<UtxosResponse> {
        const url = `${this.jobApiUrl}treasury/utxos`
        const body = { plutus }
        const response = await query(url, 'POST', body)

        return await response.json() as UtxosResponse
    }

    async getTreasuryWithdraw(plutus: string): Promise<WithdrawResponse> {
        const url = `${this.jobApiUrl}treasury/withdraw`
        const body = {
            plutus,
            params: await this.sign(String(Date.now()))
        }
        const response = await query(url, 'POST', body)

        return await response.json() as WithdrawResponse
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

    parseRoyalty(datum: Constr<any>): Portion | undefined {
        if (datum.index == 0) {
            return {
                percent: Number(datum.fields[0].fields[0]) / 10_000,
                treasury: Data.to(datum.fields[0].fields[1])
            }
        } else {
            return undefined
        }
    }

    parseWantedAsset(datum: Constr<any>): WantedAsset {
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

    parseBeneficier(datum: Constr<any>): string {
        const beneficier_address = datum.fields[0].fields[0]
        const beneficier_stake = datum.fields[1].index == 0 ?
            datum.fields[1].fields[0].fields[0].fields[0]
            :
            undefined
        const beneficier = this.lucid.utils.credentialToAddress(
            this.lucid.utils.keyHashToCredential(beneficier_address),
            beneficier_stake ? this.lucid.utils.keyHashToCredential(beneficier_stake) : undefined
        )
        return beneficier
    }

    parseInstantbuyDatum(datumString: string): InstantBuyDatumV1 {
        const datum: Constr<any> = Data.from(datumString)

        const beneficier = this.parseBeneficier(datum.fields[0])
        const listingMarketDatum = Data.to(datum.fields[1])
        const listingAffiliateDatum = datum.fields[2].index == 0 ? Data.to(datum.fields[2].fields[0]) : listingMarketDatum
        const amount = datum.fields[3]
        const royalty = this.parseRoyalty(datum.fields[4])

        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            royalty
        }
    }

    parseOfferDatum(datumString: string): OfferDatumV1 {
        const datum: Constr<any> = Data.from(datumString)

        const beneficier = this.parseBeneficier(datum.fields[0])
        const listingMarketDatum = Data.to(datum.fields[1]).toLowerCase()
        const listingAffiliateDatum = (datum.fields[2].index == 0 ? Data.to(datum.fields[2].fields[0]) : listingMarketDatum).toLowerCase()
        const amount = datum.fields[3]
        const wantedAsset = this.parseWantedAsset(datum.fields[4])
        const royalty = this.parseRoyalty(datum.fields[5])

        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            wantedAsset,
            royalty
        }
    }

    addToTreasuries(treasuries: Map<string, bigint>, datum: string, value: bigint) {
        const prev = treasuries.get(datum) || 0n
        treasuries.set(datum, prev + value)
    }

    async payToTreasuries(tx: Tx, utxo: OutRef, payToTreasuries: Map<string, bigint>, force: boolean): Promise<Tx> {
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
                tx = tx.collectFrom(
                    [treasury],
                    Data.void()
                ).payToContract(
                    treasury.address,
                    { inline: datum },
                    { lovelace: BigInt(treasury.assets.lovelace) + BigInt(Math.max(Number(this.minimumFee), Number(payToTreasuries.get(datum)!))) }
                )
            }
            // There is no free treasury
            else {
                tx = tx.payToContract(
                    this.getTreasuryAddress(),
                    { inline: datum },
                    { lovelace: BigInt(Math.max(Number(payToTreasuries.get(datum)!), Number(this.minimumAdaAmount))) }
                )
            }
        }
        tx = tx.attachSpendingValidator(this.treasuryScript)
        return tx
    }

    async instantBuyListTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
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
                lovelace: this.minimumAdaAmount
            }
        )

        return tx
    }

    async instantbuyList(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txList = this.lucid.newTx()
        txList = await this.instantBuyListTx(txList, unit, price, listing, affiliate, royalty)

        return await this.finishTx(txList)
    }

    async instantBuyCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx> {
        const toSpend = await this.lucid.utxosByOutRef([utxo])
        tx = tx
            .collectFrom(toSpend, Data.to(new Constr(1, [])))
            .attachSpendingValidator(this.instantBuyScript)
            .addSigner(await this.lucid.wallet.address())
        return tx
    }

    async instantBuyCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.lucid.newTx()
        txCancel = await this.instantBuyCancelTx(txCancel, utxo)
        return await this.finishTx(txCancel)
    }

    async instantBuyUpdateTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        const toSpend = await this.lucid.utxoByUnit(unit)
        tx = await this.instantBuyCancelTx(tx, {
            txHash: toSpend.txHash,
            outputIndex: toSpend.outputIndex
        })
        tx = await this.instantBuyListTx(tx, unit, price, listing, affiliate, royalty)
        return tx
    }

    async instantBuyUpdate(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.lucid.newTx()
        txUpdate = await this.instantBuyUpdateTx(txUpdate, unit, price, listing, affiliate, royalty)
        return await this.finishTx(txUpdate)
    }

    async instantBuyProceed(utxo: OutRef, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {

        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ])

        const params = this.parseInstantbuyDatum(collectUtxo.datum!)
        const provision = 0.025 * Number(params.amount)
        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.treasuryDatum, BigInt(Math.max(Math.ceil(provision * 0.1), Number(this.minimumJobFee))))

        this.addToTreasuries(payToTreasuries, params.listingMarketDatum, BigInt(Math.ceil(Number(provision) * 0.2)))
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum, BigInt(Math.ceil(Number(provision) * 0.2)))

        for (let portion of sellMarketPortions) {
            this.addToTreasuries(
                payToTreasuries,
                portion.treasury.toLowerCase(),
                BigInt(
                    Math.max(Math.ceil(Number(provision) * 0.5 * portion.percent), Number(this.minimumFee))
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

        let buildTx = this.lucid
            .newTx()
            // TODO: To test big portion of assets
            //.collectFrom(await this.lucid.wallet.getUtxos())
            .collectFrom(
                [
                    collectUtxo
                ],
                buyRedeemer
            )
            .attachSpendingValidator(this.instantBuyScript)

        buildTx = buildTx.payToAddress(
            params.beneficier,
            { lovelace: params.amount + collectUtxo.assets.lovelace }
        )
        buildTx = await this.payToTreasuries(buildTx, utxo, payToTreasuries, force)
        return await this.finishTx(buildTx)
    }

    async offerListTx(tx: Tx, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
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
                lovelace: this.minimumAdaAmount + price
            }
        )

        return tx
    }

    async offerList(asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion) {
        let txList = this.lucid.newTx()
        txList = await this.offerListTx(txList, asset, price, listing, affiliate, royalty)

        return {
            txHash: await this.finishTx(txList),
            outputIndex: 0
        }
    }

    async offerCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx> {
        const toSpend = await this.lucid.utxosByOutRef([utxo])
        tx = tx
            .collectFrom(toSpend, Data.to(new Constr(1, [])))
            .attachSpendingValidator(this.offerScript)
            .addSigner(await this.lucid.wallet.address())
        return tx
    }

    async offerCancel(utxo: OutRef): Promise<string> {
        let txCancel = this.lucid.newTx()
        txCancel = await this.offerCancelTx(txCancel, utxo)
        return await this.finishTx(txCancel)
    }

    async offerUpdateTx(tx: Tx, utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx> {
        tx = await this.offerCancelTx(tx, utxo)
        tx = await this.offerListTx(tx, asset, price, listing, affiliate, royalty)
        return tx
    }

    async offerUpdate(utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string> {
        let txUpdate = this.lucid.newTx()
        txUpdate = await this.offerUpdateTx(txUpdate, utxo, asset, price, listing, affiliate, royalty)
        return await this.finishTx(txUpdate)
    }

    async offerProceed(utxo: OutRef, unit: Unit, force: boolean = false, ...sellMarketPortions: Portion[]): Promise<string> {

        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ])

        const params = this.parseOfferDatum(collectUtxo.datum!)
        const provision = 0.025 * Number(params.amount)

        console.debug("Offer", params)
        const payToTreasuries = new Map<string, bigint>()
        payToTreasuries.set(this.treasuryDatum, BigInt(Math.max(Math.ceil(provision * 0.1), Number(this.minimumJobFee))))

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

        let buildTx = this.lucid
            .newTx()
            // TODO: To test big portion of assets
            //.collectFrom(await this.lucid.wallet.getUtxos())
            .collectFrom(
                [
                    collectUtxo
                ],
                buyRedeemer
            )
            .attachSpendingValidator(this.offerScript)


        buildTx = buildTx.payToAddress(
            params.beneficier,
            {
                lovelace: this.minimumAdaAmount,
                [unit]: 1n
            }
        )
        buildTx = await this.payToTreasuries(buildTx, utxo, payToTreasuries, force)

        return await this.finishTx(buildTx)
    }

    registerStakeTx(tx: Tx, stake: string): Tx {
        let newTx = tx.registerStake(stake)
        return newTx
    }

    async registerStakes(stakes: string[]): Promise<string> {
        let newTx = this.lucid.newTx()
        for (let stake of stakes) {
            newTx = newTx.registerStake(stake)
        }
        newTx = await this.addJobTokens(newTx)
        return await this.finishTx(newTx)
    }

    delegateTx(tx: Tx, stake: string, poolId: string): Tx {
        const credential = this.lucid.utils.scriptHashToCredential(stake)
        const rewardAddress = this.lucid.utils.credentialToRewardAddress(credential)
        let newTx = tx.delegateTo(rewardAddress, poolId, Data.void())
        return newTx
    }

    async delegate(stake: string, poolId: string): Promise<string> {
        let newTx = this.lucid.newTx()
        newTx = this.delegateTx(newTx, stake, poolId)
        newTx = await this.addJobTokens(newTx)
        newTx = newTx.attachWithdrawalValidator(this.jamStakes.get(stake)!)
        return await this.finishTx(newTx)
    }

    withdrawTx(tx: Tx, stake: string, amount: bigint): Tx {
        const credential = this.lucid.utils.scriptHashToCredential(stake)
        const rewardAddress = this.lucid.utils.credentialToRewardAddress(credential)
        let newTx = tx.withdraw(rewardAddress, amount, Data.void())
        return newTx
    }

    async withdraw(stake: string, amount: bigint): Promise<string> {
        let newTx = this.lucid.newTx()
        newTx = this.withdrawTx(newTx, stake, amount)
        newTx = await this.addJobTokens(newTx)
        newTx = newTx.attachWithdrawalValidator(this.jamStakes.get(stake)!)
        return await this.finishTx(newTx)
    }

    async addJobTokens(tx: Tx): Promise<Tx> {
        return tx.payToAddress(
            await this.lucid.wallet.address(),
            { [this.jamTokenPolicy + this.jamTokenName]: this.numberOfToken }
        )
    }

    async finishTx(tx: Tx): Promise<string> {
        const txComplete = await tx.complete()
        const signedTx = await txComplete.sign().complete()
        const txHash = await signedTx.submit()

        return txHash
    }

}
