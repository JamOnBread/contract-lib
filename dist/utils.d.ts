import { C, Constr } from "lucid-cardano";
export declare function encodeAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
export declare function encodeTreasuryDatumAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
export declare function encodeTreasuryDatumTokens(currencySymbol: string, minTokens: BigInt): Constr<any>;
export declare function encodeRoyalty(royaltyWM?: C.PlutusData, percent?: number): Constr<any>;
