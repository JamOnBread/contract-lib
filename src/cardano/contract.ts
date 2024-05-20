
import { Data, Constr, paymentCredentialOf } from "lucid-cardano"
import type { Assets, Credential, Lucid, OutRef, Tx, UTxO } from "lucid-cardano"
import { Context } from "./context"
import { Transaction } from "./transaction"
import { JobCardano } from "../index"


export function parseAddress(job: JobCardano, datum: Constr<any>): string {
    const paymentCred = datum.fields[0].fields[0]
    const stakeCred = datum.fields[1].index == 0 ?
        datum.fields[1].fields[0].fields[0].fields[0]
        :
        undefined
    const address = job.lucid.utils.credentialToAddress(
        job.lucid.utils.keyHashToCredential(paymentCred),
        stakeCred ? job.lucid.utils.keyHashToCredential(stakeCred) : undefined
    )
    return address
}

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

    // Create lsiting or treasury
    listTx(job: JobCardano, tx: Transaction, ...args: any[]): Promise<Transaction>
    // Buy listing or spend treasury
    processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction>
    // Cancel TX or withdraw treasury
    cancelTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction>

    parseDatum<Datum>(job: JobCardano, datum: string): Datum
    getAddress(job: JobCardano, stakeId?: number): string
    getStakeNumber(): number
}

export class ContractBase implements Contract {
    readonly type: ContractType
    readonly active: boolean
    readonly hash: string
    private stakes?: string[]
    readonly treasury?: Contract

    constructor(type: ContractType, active: boolean, hash: string, stakes?: string[], treasury?: Contract,) {
        this.type = type
        this.active = active
        this.hash = hash
        this.stakes = stakes
        this.treasury = treasury
    }

    async listTx(job: JobCardano, tx: Transaction, ...args: any[]): Promise<Transaction> {
        throw new Error("not Implemented")
    }

    async processTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {
        tx = tx.spend(utxo, Data.void())
        tx = tx.sign(await job.lucid.wallet.address())
        return tx
    }

    async cancelTx(job: JobCardano, tx: Transaction, utxo: UTxO, ...args: any[]): Promise<Transaction> {
        // Spend UTxO
        console.log("Cancel Tx")
        tx = tx.spend(utxo, Data.to(new Constr(1, [])))
        // Sign by address
        tx = tx.sign(await job.lucid.wallet.address())
        return tx
    }

    parseDatum<Datum>(job: JobCardano, datum: string): Datum {
        throw new Error("not Implemented")
    }

    getStakeLength(): number {
        return this.stakes?.length || 0
    }

    getStakeNumber(stakeId?: number): number {
        if (typeof stakeId === "undefined" || stakeId < 0 || stakeId > this.getStakeLength())
            return Math.round(Math.random() * this.stakes!.length)
        return stakeId
    }

    getStake(stakeId?: number): string {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.stakes!.length)

        return this.stakes![stakeId % this.stakes!.length]
    }

    getAddress(job: JobCardano, stakeId?: number): string {
        const paymentCredential = {
            type: "Script",
            hash: this.hash
        } as Credential

        const stakeCredential = {
            type: "Script",
            hash: this.getStake(stakeId)
        } as Credential

        return job.lucid.utils.credentialToAddress(paymentCredential, stakeCredential)
    }
}