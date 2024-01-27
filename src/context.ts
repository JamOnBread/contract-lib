
import { Data, Constr, Lucid, Network, OutRef, UTxO, Tx, paymentCredentialOf, Credential } from "lucid-cardano"
import { Portion, WantedAsset, InstantBuyDatumV1, OfferDatumV1 } from "./types"

export enum ContractType {
    Unknown,
    JobTreasury,
    JobInstantBuy,
    JobOffer,
    JobStake,
    JobLock,

    JPG,
}

export interface Contract {
    type: ContractType,
    active: boolean,
    hash: string,
    treasury?: Contract

    collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx>
    attachTx(lucid: Lucid, tx: Tx): Promise<Tx>
    parseDatum(lucid: Lucid, datum: string): any
}

export class ContractBase implements Contract {
    readonly type: ContractType
    readonly active: boolean
    readonly hash: string
    readonly treasury?: Contract
    private ref?: OutRef
    private script?: string
    private utxo?: UTxO

    constructor(type: ContractType, active: boolean, hash: string, ref?: OutRef, script?: string, tresury?: Contract) {
        this.type = type
        this.active = active
        this.ref = ref
        this.hash = hash
        this.utxo = undefined
        this.script = script
        this.treasury = tresury
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

    parseDatum(lucid: Lucid, datum: string) {
        throw new Error("No script provided")
    }
}

export class Context {

    readonly jobTokenPolicy: string
    readonly jobTokenName: string
    readonly numberOfToken: number
    readonly minimumAdaAmount: bigint = 2_000_000n
    readonly minimumJobFee: bigint = 100_000n
    readonly minimumFee = 20_000n

    readonly contracts: Contract[]
    readonly stakes: string[]

    constructor(
        jobTokenPolicy: string,
        jobTokenName: string,
        numberOfToken: number,
        contracts: Contract[],
        stakes: string[]) {

        this.jobTokenPolicy = jobTokenPolicy
        this.jobTokenName = jobTokenName
        this.numberOfToken = numberOfToken

        this.contracts = contracts
        this.stakes = stakes
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

    public getStakeNumber(): number {
        return this.stakes.length
    }

    public getStake(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.stakes.length)

        return this.stakes[stakeId % this.stakes.length]
    }

    public getContractAddress(lucid: Lucid, contract: Contract, stakeId?: number): string {
        const paymentCredential = {
            type: "Script",
            hash: contract.hash
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.getStake(stakeId)
        } as Credential

        return lucid.utils.credentialToAddress(paymentCredential, stakeCredential)

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

export function parseBeneficier(lucid: Lucid, datum: Constr<any>): string {
    const beneficier_address = datum.fields[0].fields[0]
    const beneficier_stake = datum.fields[1].index == 0 ?
        datum.fields[1].fields[0].fields[0].fields[0]
        :
        undefined
    const beneficier = lucid.utils.credentialToAddress(
        lucid.utils.keyHashToCredential(beneficier_address),
        beneficier_stake ? lucid.utils.keyHashToCredential(beneficier_stake) : undefined
    )
    return beneficier
}

export class JobContract extends ContractBase { }
export class JobContractInstantBuy extends JobContract {

    public parseDatum(lucid: Lucid, datumString: string): InstantBuyDatumV1 {
        const datumParsed: Constr<any> = Data.from(datumString)

        const beneficier = parseBeneficier(lucid, datumParsed.fields[0])
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

        const beneficier = parseBeneficier(lucid, datum.fields[0])
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
    async collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx> {
        tx = tx.collectFrom([utxo], Data.void())
        tx = await this.attachTx(lucid, tx)
        return tx
    }
}