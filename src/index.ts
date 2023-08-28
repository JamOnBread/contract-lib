import { Lucid, OutRef, PolicyId, Unit, C, Constr, Credential, UTxO, Data, fromText } from "lucid-cardano"

export const TREASURY_MINT_NAME = "WITHDRAW_TREASURY"
export const INSTANTBUY_MINT_NAME = "INSTANT_BUY"
export const OFFER_MINT_NAME = "ACCEPT_OFFER"
export const UTXO_MIN_ADA = 2_000_000n

export type UTxOs = {
    protocolParams: OutRef,
    treasuryScript: OutRef,
    treasuryPolicy: OutRef,
    instantbuyScript: OutRef,
    instantbuyPolicy: OutRef,
    offerScript: OutRef,
    offerPolicy: OutRef
}

export type Hashes = {
    treasuryScript: String,
    treasuryPolicy: String,
    instantbuyScript: String,
    instantbuyPolicy: String,
    offerScript: String,
    offerPolicy: String,
}

export type Context = {
    utxos: UTxOs,
    hashes: Hashes,
    jobToken: PolicyId,
    jobTokenName: string,
    jobTokenCount: number,
    stakes: string[]
}

export type InstantBuyDatum = {
    beneficier: string,
    amount: bigint,
    listing: string,
    affiliate: string | undefined,
    royalty: string | undefined,
    percent: bigint | undefined
}

export type OfferDatum = {
    offerrer: string,
    policyId: PolicyId,
    name: string,
    amount: bigint,
    listing: string,
    affiliate: string | undefined,
    royalty: string | undefined,
    percent: bigint | undefined
}

export function encodeAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
): Constr<any> {
    const paymentCredential = new Constr(0, [paymentPubKeyHex]);

    const stakingCredential = stakingPubKeyHex
        ? new Constr(0, [new Constr(0, [new Constr(0, [stakingPubKeyHex])])])
        : new Constr(1, []);

    return new Constr(0, [paymentCredential, stakingCredential]);
}

export function encodeTreasuryDatumAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
): Constr<any> {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex);
    return new Constr(0, [address]);
}

export function encodeTreasuryDatumTokens(
    currencySymbol: string,
    minTokens: BigInt
): Constr<any> {
    return new Constr(1, [new Constr(0, [currencySymbol, minTokens])]);
}

export function encodeRoyalty(royaltyWM?: C.PlutusData, percent?: number): Constr<any> {
    return royaltyWM && percent
        ? new Constr(0, [new Constr(0, [BigInt(percent * 10_000), royaltyWM])])
        : new Constr(1, []);
}

export const encodeWantedAsset = (policyIdHex: string, tokenNameHex?: string) => {
    return tokenNameHex ?
        new Constr(0, [new Constr(0, [policyIdHex, tokenNameHex])]) :
        new Constr(1, [policyIdHex])
}

export class JoB {
    ctx: Context

    constructor(ctx: Context) {
        this.ctx = ctx
    }

    public get treasuryDatum(): Constr<any> {
        return encodeTreasuryDatumTokens(this.ctx.jobToken, BigInt(this.ctx.jobTokenCount / 2 + 1))
    }

    getTreasuryAddress(lucid: Lucid, stake: number): string {
        const paymentCredential = {
            type: "Script",
            hash: this.ctx.hashes.treasuryScript
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.ctx.stakes[stake]
        } as Credential

        return lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    getInstantbuyAddress(lucid: Lucid, stake?: number): string {

        const stakeId = stake ? stake : Math.floor(Math.random() * this.ctx.stakes.length)

        const paymentCredential = {
            type: "Script",
            hash: this.ctx.hashes.instantbuyScript
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.ctx.stakes[stakeId]
        } as Credential

        return lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    getOfferAddress(lucid: Lucid, stake?: number): string {
        const stakeId = stake ? stake : Math.floor(Math.random() * this.ctx.stakes.length)
        const paymentCredential = {
            type: "Script",
            hash: this.ctx.hashes.offerScript
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.ctx.stakes[stakeId]
        } as Credential

        return lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }

    /**
     * Get free treasuries
     * @param lucid 
     * @returns UTxOs
     */
    async getTreasuries(lucid: Lucid): Promise<UTxO[]> {
        return await lucid.utxosAt(this.getTreasuryAddress(lucid, 0))
    }

    async getEncodedAddress(lucid: Lucid): Promise<Constr<any>> {
        const address = await lucid.wallet.address()
        const payCred = lucid.utils.paymentCredentialOf(address)
        try {
            const stakeCred = lucid.utils.stakeCredentialOf(address)
            return encodeAddress(payCred.hash, stakeCred!.hash)
        }
        catch (e) {
            return encodeAddress(payCred.hash)
        }
    }

    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined {
        const index = treasuries.findIndex((value: UTxO) => value.datum == datum)

        if (index > -1) {
            const element = treasuries[index]
            treasuries.splice(index, 1)
            return element
        }
        return undefined
    }

    parseInstantbuyDatum(lucid: Lucid, datumString: string): InstantBuyDatum {
        const datum: Constr<any> = Data.from(datumString)
        const amount = datum.fields[3]
        const listing = Data.to(datum.fields[1])
        const beneficier_address = datum.fields[0].fields[0].fields[0]
        const beneficier_stake = datum.fields[0].fields[1].fields[0].fields[0].fields[0]

        const beneficier = lucid.utils.credentialToAddress(
            lucid.utils.keyHashToCredential(beneficier_address), 
            beneficier_stake?lucid.utils.keyHashToCredential(beneficier_stake):undefined
        )

        return {
            amount,
            listing,
            beneficier,

            affiliate: undefined,
            percent: undefined,
            royalty: undefined
        }
    }


    parseOfferDatum(lucid: Lucid, datumString: string): OfferDatum {
        const datum: Constr<any> = Data.from(datumString)

        const offerrer_address = datum.fields[0].fields[0].fields[0]
        const offerrer_stake = datum.fields[0]?.fields[1]?.fields[0]?.fields[0]?.fields[0]
        const offerrer = lucid.utils.credentialToAddress(
            lucid.utils.keyHashToCredential(offerrer_address), 
            offerrer_stake?lucid.utils.keyHashToCredential(offerrer_stake):undefined
        )

        const listing = Data.to(datum.fields[1])
        const amount = datum.fields[3]
        const policyId = datum.fields[4].fields[0].fields[0]
        const name = datum.fields[4].fields[0].fields[1]

        return {
            offerrer,
            policyId,
            name,
            amount,
            listing,
            affiliate: undefined,
            royalty: undefined,
            percent: undefined
        }
    }

    async getInstantbuys(lucid: Lucid): Promise<UTxO[]> {
        const paymentCredential = {
            type: "Script",
            hash: this.ctx.hashes.instantbuyScript
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.ctx.stakes[0]
        } as Credential

        return await lucid.utxosAt(lucid.utils.credentialToAddress(paymentCredential, stakeCredential))
    }

    async treasuryCreate(lucid: Lucid, datum: string, stake: number): Promise<OutRef> {
        const treasuryAddress = this.getTreasuryAddress(lucid, stake)

        const tx = await lucid
            .newTx()
            .payToContract(
                treasuryAddress,
                { inline: datum },
                {
                    lovelace: BigInt(2n * UTXO_MIN_ADA)
                }
            )
            .complete()
        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }
    }

    async treasuryCreateToken(lucid: Lucid, stake: number = 0): Promise<OutRef> {
        const datum = this.treasuryDatum
        return await this.treasuryCreate(lucid, Data.to(datum), stake)
    }

    async treasuryCreateAddress(lucid: Lucid, stake: number = 0, address?: string): Promise<OutRef> {
        const addr = lucid.utils.paymentCredentialOf(address ? address : await lucid.wallet.address())
        const datum = encodeTreasuryDatumAddress(addr.hash)

        return await this.treasuryCreate(lucid, Data.to(datum), stake)
    }

    async treasuryWithdraw(lucid: Lucid, datum: String, type: "Token" | "Address"): Promise<OutRef> {
        const address = await lucid.wallet.address()
        const utxos = (await this.getTreasuries(lucid)).filter(value => value.datum == datum && value.assets.lovelace > UTXO_MIN_ADA)
        const withdrawFeesRedeemer = Data.to(new Constr(1, []));
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.treasuryScript,
            this.ctx.utxos.treasuryPolicy,
            this.ctx.utxos.protocolParams
        ])

        // Start building transaction
        let buildTx = lucid
            .newTx()
            .mintAssets(
                {
                    [this.ctx.hashes.treasuryPolicy + fromText(TREASURY_MINT_NAME)]: BigInt(1)
                },
                Data.to(new Constr(0, []))
            )
            .readFrom(readUtxos)
            .collectFrom(
                utxos,
                withdrawFeesRedeemer
            )
        let amount = BigInt(0)

        for (let utxo of utxos) {
            buildTx = buildTx
                .payToContract(
                    utxo.address,
                    { inline: utxo.datum! },
                    { lovelace: BigInt(UTXO_MIN_ADA) }
                )
            amount += utxo.assets.lovelace - BigInt(UTXO_MIN_ADA);
        }
        buildTx = buildTx.payToAddress(address, { lovelace: amount })

        const tx = (
            type == "Address" ? await buildTx.addSigner(address).complete() : await buildTx.payToAddress(
                address, {
                [this.ctx.jobToken + this.ctx.jobTokenName]: BigInt(this.ctx.jobTokenCount / 2 + 1)
            }
            )
                .complete()
        )

        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }
    }

    async instantbuyList(lucid: Lucid, unit: Unit, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number) {

        const sellerAddr = await this.getEncodedAddress(lucid)
        const datum = new Constr(0, [
            sellerAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            royalty && percent ? new Constr(0, [new Constr(0, [BigInt(percent * 10_000), Data.from(royalty)])]) : new Constr(1, [])
        ]);

        const tx = await lucid
            .newTx()
            .payToContract(
                this.getInstantbuyAddress(lucid),
                { inline: Data.to(datum) },
                { [unit]: BigInt(1), lovelace: UTXO_MIN_ADA }
            )
            .complete();

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();

        return {
            txHash,
            outputIndex: 0
        }
    }

    async instantBuyCancel(lucid: Lucid, utxo: OutRef) {
        const cancelRedeemer = Data.to(new Constr(1, []));
        const toSpend = await lucid.utxosByOutRef([utxo])
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.instantbuyScript
        ])
        const txCancel = await lucid
            .newTx()
            .collectFrom(toSpend, cancelRedeemer)
            .readFrom(readUtxos)
            .addSigner(await lucid.wallet.address())
            .complete()

        const signedTx = await txCancel
            .sign()
            .complete()

        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }
    }

    async instantBuyCancelUnit(lucid: Lucid, unit: Unit) {
        const utxo = await lucid.utxoByUnit(unit)
        return await this.instantBuyCancel(lucid, utxo)
    }

    async instantBuyUpdate(lucid: Lucid, unit: Unit, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number) {
        const toSpend = await lucid.utxoByUnit(unit)
        const cancelRedeemer = Data.to(new Constr(1, []));
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.instantbuyScript
        ])
        const sellerAddr = await this.getEncodedAddress(lucid)

        const datum = new Constr(0, [
            sellerAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            royalty && percent ? new Constr(0, [new Constr(0, [BigInt(percent * 10_000), Data.from(royalty)])]) : new Constr(1, [])
        ]);

        const txUpdate = await lucid
            .newTx()
            .collectFrom([toSpend], cancelRedeemer)
            .readFrom(readUtxos)
            .payToContract(
                this.getInstantbuyAddress(lucid),
                { inline: Data.to(datum) },
                { [unit]: BigInt(1), lovelace: UTXO_MIN_ADA }
            )
            .addSigner(await lucid.wallet.address())
            .complete();

        const signedTx = await txUpdate.sign().complete();
        const txHash = await signedTx.submit();

        return {
            txHash,
            outputIndex: 0
        }
    }

    async instantBuyProceed(lucid: Lucid, utxo: OutRef, marketTreasury: string) {
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.instantbuyScript,
            this.ctx.utxos.instantbuyPolicy,
            this.ctx.utxos.treasuryScript,
            this.ctx.utxos.protocolParams
        ])

        const [collectUtxo] = await lucid.utxosByOutRef([
            utxo
        ])

        const treasuries = await this.getTreasuries(lucid)
        const params = this.parseInstantbuyDatum(lucid, collectUtxo.datum!)

        const job = this.getTreasury(treasuries, Data.to(this.treasuryDatum))!
        const listing = this.getTreasury(treasuries, params.listing)!
        const market = this.getTreasury(treasuries, marketTreasury)!

        const provision = 0.025 * Number(params.amount)
        const payFeesRedeemer = Data.to(new Constr(0, []))
        const buyRedeemer = Data.to(new Constr(0, [
            Array.from([
                new Constr(0,
                    [
                        BigInt(10_000),
                        Data.from(marketTreasury)
                    ]
                ), // selling marketplace
            ])
        ]));

        // JoB treasury
        const collectFromTreasuries = {
            [job!.datum!]: job
        }
        const payToTreasuries = {
            [job!.datum!]: provision * 0.1
        }

        // Listing marketplace
        if (listing!.datum! in collectFromTreasuries) {
            payToTreasuries[listing!.datum!] += provision * 0.4
        } else {
            collectFromTreasuries[listing?.datum!] = listing
            payToTreasuries[listing!.datum!] = provision * 0.4
        }

        // Selling marketplace
        if (market!.datum! in collectFromTreasuries) {
            payToTreasuries[market!.datum!] += provision * 0.5
        } else {
            payToTreasuries[market!.datum!] = provision * 0.5
            collectFromTreasuries[market!.datum!] = market
        }


        let buildTx = lucid
            .newTx()
            .mintAssets(
                { [this.ctx.hashes.instantbuyPolicy + fromText(INSTANTBUY_MINT_NAME)]: BigInt(1) },
                Data.to(new Constr(0, []))
            )
            .readFrom(readUtxos)
            .collectFrom(
                Object.values(collectFromTreasuries),
                payFeesRedeemer
            )
            .collectFrom(
                [
                    collectUtxo
                ],
                buyRedeemer
            )

        for (let treasury of Object.values(collectFromTreasuries)) {
            buildTx = buildTx.payToContract(
                treasury.address,
                { inline: treasury.datum! },
                { lovelace: BigInt(treasury.assets.lovelace) + BigInt(payToTreasuries[treasury.datum!]) }
            )
        }


        buildTx = buildTx.payToAddress(
            params.beneficier,
            { lovelace: params.amount + collectUtxo.assets.lovelace }
        )
            .addSigner(await lucid.wallet.address())

        const tx = await buildTx.complete()
        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }
    }

    async instantBuyProceedUnit(lucid: Lucid, unit: Unit, marketTreasury: string) {
        const utxo = await lucid.utxoByUnit(unit)
        return await this.instantBuyProceed(lucid, utxo, marketTreasury)
    }

    async offerList(lucid: Lucid, policyId: PolicyId, name: string | undefined, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number): Promise<OutRef> {
        const offerrerAddress = await this.getEncodedAddress(lucid)
        const wantedAsset = encodeWantedAsset(policyId, name);

        const datum = new Constr(0, [
            offerrerAddress,
            Data.from(listing),
            new Constr(1, []),
            price,
            wantedAsset,
            new Constr(1, [])
        ]);

        const tx = await lucid
            .newTx()
            .payToContract(
                this.getOfferAddress(lucid),
                { inline: Data.to(datum) },
                { lovelace: BigInt(Number(price)) + 2_000_000n }
            )
            .complete();

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();
        return {
            txHash: txHash,
            outputIndex: 0
        }
    }

    async offerCancel(lucid: Lucid, outRefs: OutRef[]): Promise<OutRef> {
        const cancelRedeemer = Data.to(new Constr(1, []));
        const toSpend = await lucid.utxosByOutRef(outRefs)
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.offerScript
        ])
        const txCancel = await lucid
            .newTx()
            .readFrom(readUtxos)
            .collectFrom(toSpend, cancelRedeemer)
            .addSigner(await lucid.wallet.address())
            .complete()

        const signedTx = await txCancel
            .sign()
            .complete()

        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }
    }

    async offerProceed(lucid: Lucid, utxo: OutRef, policyId: PolicyId, name: string, marketTreasury: string) {
        const readUtxos = await lucid.utxosByOutRef([
            this.ctx.utxos.offerScript,
            this.ctx.utxos.offerPolicy,
            this.ctx.utxos.treasuryScript,
            this.ctx.utxos.protocolParams
        ])

        const [collectUtxo] = await lucid.utxosByOutRef([
            utxo
        ])

        const treasuries = await this.getTreasuries(lucid)
        const params = this.parseOfferDatum(lucid, collectUtxo.datum!)

        const job = this.getTreasury(treasuries, Data.to(this.treasuryDatum))!
        const listing = this.getTreasury(treasuries, params.listing)!
        const market = this.getTreasury(treasuries, marketTreasury)!

        const provision = 0.025 * Number(params.amount)
        const payFeesRedeemer = Data.to(new Constr(0, []))
        const buyRedeemer = Data.to(new Constr(0, [
            Array.from([
                new Constr(0,
                    [
                        BigInt(10_000),
                        Data.from(marketTreasury)
                    ]
                ), // selling marketplace
            ])
        ]));

        // JoB treasury
        const collectFromTreasuries = {
            [job!.datum!]: job
        }
        const payToTreasuries = {
            [job!.datum!]: provision * 0.1
        }

        // Listing marketplace
        if (listing!.datum! in collectFromTreasuries) {
            payToTreasuries[listing!.datum!] += provision * 0.4
        } else {
            collectFromTreasuries[listing?.datum!] = listing
            payToTreasuries[listing!.datum!] = provision * 0.4
        }

        // Selling marketplace
        if (market!.datum! in collectFromTreasuries) {
            payToTreasuries[market!.datum!] += provision * 0.5
        } else {
            payToTreasuries[market!.datum!] = provision * 0.5
            collectFromTreasuries[market!.datum!] = market
        }

        const deposit = collectUtxo.assets.lovelace - params.amount

        let buildTx = lucid
            .newTx()
            .mintAssets(
                { [this.ctx.hashes.offerPolicy + fromText(OFFER_MINT_NAME)]: BigInt(1) },
                Data.to(new Constr(0, []))
            )
            .readFrom(readUtxos)
            .collectFrom(
                Object.values(collectFromTreasuries),
                payFeesRedeemer
            )
            .collectFrom(
                [
                    collectUtxo
                ],
                buyRedeemer
            )

        for (let treasury of Object.values(collectFromTreasuries)) {
            buildTx = buildTx.payToContract(
                treasury.address,
                { inline: treasury.datum! },
                { lovelace: BigInt(treasury.assets.lovelace) + BigInt(payToTreasuries[treasury.datum!]) }
            )
        }

        buildTx = buildTx.payToAddress(
            params.offerrer,
            {
                lovelace: deposit,
                [policyId + name]: BigInt(1),
            })

        const tx = await buildTx.complete()
        const signedTx = await tx.sign().complete()
        const txHash = await signedTx.submit()

        return {
            txHash,
            outputIndex: 0
        }

    }
}