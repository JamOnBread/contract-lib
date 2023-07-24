import { Lucid, OutRef, Unit, Constr, UTxO } from "lucid-cardano";
import { Context, InstantBuyDatum } from "./types";
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
    instantbuyCreate(lucid: Lucid, unit: Unit, price: bigint, listing: string, affiliate?: string, royalty?: string, percent?: number): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyCancel(lucid: Lucid, utxo: OutRef): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    instantBuyProceed(lucid: Lucid, utxo: OutRef, marketTreasury: string): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
}
