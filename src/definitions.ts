import type { OutRef } from "lucid-cardano"


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

export enum Lock {
    Locked,
    Partial,
    Blocked,
    Error
}
