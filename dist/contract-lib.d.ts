import { Script, Lucid, Constr, PolicyId, Tx, OutRef, UTxO, Unit } from 'lucid-cardano';

type Portion = {
    percent: number;
    treasury: string;
};
type WantedAsset = {
    policyId: string;
    assetName: string | undefined;
};
type InstantBuyDatumV1 = {
    beneficier: string;
    listingMarketDatum: string;
    listingAffiliateDatum: string;
    amount: bigint;
    royalty: Portion | undefined;
};
type OfferDatumV1 = {
    beneficier: string;
    listingMarketDatum: string;
    listingAffiliateDatum: string;
    amount: bigint;
    wantedAsset: WantedAsset;
    royalty: Portion | undefined;
};
declare function version(): string;
declare function getValidator(title: string): any;
declare function getCompiledCode(title: string): Script;
declare function applyCodeParamas(code: Script, params: any): Script;
declare function getCompiledCodeParams(title: string, params: any): Script;
declare function getRewardAddress(lucid: Lucid, stake: string): string;
declare function encodeAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
declare function encodeTreasuryDatumAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<any>;
declare const encodeTreasuryDatumTokens: (currencySymbol: string, minTokens: BigInt) => Constr<any>;
declare function encodeRoyalty(portion?: Portion): Constr<any>;
declare function encodeWantedAsset(wantedAsset: WantedAsset): Constr<any>;
/**
 * Mint new unique asset
 *
 * @param lucid
 * @param name
 * @param amount
 * @returns transaction hash
 */
declare function mintUniqueAsset(lucid: Lucid, name: string, amount: bigint): Promise<string>;
declare class JamOnBreadAdminV1 {
    private static numberOfStakes;
    private static numberOfToken;
    private static treasuryScriptTitle;
    private static instantBuyScriptTitle;
    private static offerScriptTitle;
    private static minimumAdaAmount;
    private static minimumJobFee;
    private jamTokenPolicy;
    private jamTokenName;
    private jamStakes;
    private lucid;
    private treasuryScript;
    private instantBuyScript;
    private offerScript;
    private treasuryDatum;
    static getTreasuryScript(): Script;
    static getJamStakes(lucid: Lucid, policyId: PolicyId, amount: bigint, number: bigint): string[];
    constructor(lucid: Lucid, jamTokenPolicy: string, jamTokenName: string);
    createJobToken(): Constr<any>;
    payJoBToken(tx: Tx, amount: bigint): Promise<Tx>;
    squashNft(): Promise<OutRef>;
    getInstantBuyScript(): Script;
    getOfferScript(): Script;
    getTreasuryAddress(stakeId?: number): string;
    getEncodedAddress(): Promise<Constr<any>>;
    getInstantBuyAddress(stakeId?: number): string;
    getOfferAddress(stakeId?: number): string;
    getTreasuries(): Promise<UTxO[]>;
    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined;
    parseRoyalty(datum: Constr<any>): Portion | undefined;
    parseWantedAsset(datum: Constr<any>): WantedAsset;
    parseBeneficier(datum: Constr<any>): string;
    parseInstantbuyDatum(datumString: string): InstantBuyDatumV1;
    parseOfferDatum(datumString: string): OfferDatumV1;
    addToTreasuries(treasuries: Record<string, bigint>, datum: string, value: bigint): void;
    payToTreasuries(tx: Tx, payToTreasuries: Record<string, bigint>, force: boolean): Promise<Tx>;
    instantBuyListTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    instantbuyList(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string>;
    instantBuyCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx>;
    instantBuyCancel(utxo: OutRef): Promise<string>;
    instantBuyUpdateTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    instantBuyUpdate(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string>;
    instantBuyProceed(utxo: OutRef, force?: boolean, ...sellMarketPortions: Portion[]): Promise<string>;
    offerListTx(tx: Tx, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    offerList(asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<{
        txHash: string;
        outputIndex: number;
    }>;
    offerCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx>;
    offerCancel(utxo: OutRef): Promise<string>;
    offerUpdateTx(tx: Tx, utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    offerUpdate(utxo: UTxO | OutRef, asset: WantedAsset, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string>;
    offerProceed(utxo: OutRef, unit: Unit, force?: boolean, ...sellMarketPortions: Portion[]): Promise<string>;
    finishTx(tx: Tx): Promise<string>;
}

export { type InstantBuyDatumV1, JamOnBreadAdminV1, type OfferDatumV1, type Portion, type WantedAsset, applyCodeParamas, encodeAddress, encodeRoyalty, encodeTreasuryDatumAddress, encodeTreasuryDatumTokens, encodeWantedAsset, getCompiledCode, getCompiledCodeParams, getRewardAddress, getValidator, mintUniqueAsset, version };
