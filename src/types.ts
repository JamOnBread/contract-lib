import { OutRef, Unit, C, PolicyId } from "lucid-cardano"

export type UTxOs = {
    protocolParams: OutRef,
    treasuryScript: OutRef,
    treasuryPolicy: OutRef,
    instantbuyScript: OutRef,
    instnantbuyPolicy: OutRef,
    // Offer
}

export type Hashes = {
    treasuryScript: String,
    treasuryPolicy: String,
    instantbuyScript: String,
    instantbuyPolicy: String,
    // Offer
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