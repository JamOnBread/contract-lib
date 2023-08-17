import { Lucid, OutRef, PolicyId, Unit, C, Constr, UTxO } from "lucid-cardano";
export declare const TREASURY_MINT_NAME = "WITHDRAW_TREASURY";
export declare const INSTANTBUY_MINT_NAME = "INSTANT_BUY";
export declare const UTXO_MIN_ADA = 2000000n;
export type UTxOs = {
    protocolParams: OutRef;
    treasuryScript: OutRef;
    treasuryPolicy: OutRef;
    instantbuyScript: OutRef;
    instantbuyPolicy: OutRef;
};
export type Hashes = {
    treasuryScript: String;
    treasuryPolicy: String;
    instantbuyScript: String;
    instantbuyPolicy: String;
};
export type Context = {
    utxos: UTxOs;
    hashes: Hashes;
    jobToken: PolicyId;
    jobTokenName: string;
    jobTokenCount: number;
    stakes: string[];
};
export type InstantBuyDatum = {
    beneficier: string;
    amount: bigint;
    listing: string;
    affiliate: string | undefined;
    royalty: string | undefined;
    percent: bigint | undefined;
};
export declare function encodeAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
export declare function encodeTreasuryDatumAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
export declare function encodeTreasuryDatumTokens(currencySymbol: string, minTokens: BigInt): Constr<any>;
export declare function encodeRoyalty(royaltyWM?: C.PlutusData, percent?: number): Constr<any>;
export declare class JoB {
    ctx: Context;
    constructor(ctx: Context);
    get treasuryDatum(): Constr<any>;
    getTreasuryAddress(lucid: Lucid, stake: number): string;
    getInstantbuyAddress(lucid: Lucid, stake: number): string;
    /**
     * Get free treasuries
     * @param lucid
     * @returns UTxOs
     */
    getTreasuries(lucid: Lucid): Promise<UTxO[]>;
    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined;
    parseInstantbuyDatum(lucid: Lucid, datumString: string): InstantBuyDatum;
    getInstantbuys(lucid: Lucid): Promise<UTxO[]>;
    treasuryCreate(lucid: Lucid, datum: string, stake: number): Promise<OutRef>;
    treasuryCreateToken(lucid: Lucid, stake?: number): Promise<OutRef>;
    treasuryCreateAddress(lucid: Lucid, stake?: number, address?: string): Promise<OutRef>;
    treasuryWithdraw(lucid: Lucid, datum: String, type: "Token" | "Address"): Promise<OutRef>;
    instantbuyList(lucid: Lucid, unit: Unit, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyCancel(lucid: Lucid, utxo: OutRef): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyCancelUnit(lucid: Lucid, unit: Unit): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyUpdate(lucid: Lucid, unit: Unit, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyProceed(lucid: Lucid, utxo: OutRef, marketTreasury: string): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyProceedUnit(lucid: Lucid, unit: Unit, marketTreasury: string): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    private getInstantBuySellerAddress;
}
