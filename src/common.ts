import { Constr, Data, type Lucid } from "lucid-cardano"
import type { Portion, WantedAsset } from "./definitions"

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
