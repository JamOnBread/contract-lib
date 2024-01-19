import { OutRef, Script, Lucid, Constr, Data, PolicyId, Tx, UTxO, Unit } from 'lucid-cardano';

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
type SignParams = {
    address: string;
    secret: string;
    signature: string;
    key: string;
};
type ReservationResponse = {
    all: boolean;
    blocked: boolean;
    expiration: number;
    utxos: Map<string, OutRef>;
};
type UtxosResponse = {
    utxos: OutRef[];
};
type WithdrawResponse = {
    utxos: OutRef[];
    expiration: number;
};
declare function version(): string;
declare function getValidator(title: string): any;
declare function getCompiledCode(title: string): Script;
declare function applyCodeParamas(code: Script, params: any): Script;
declare function getCompiledCodeParams(title: string, params: any): Script;
declare function getRewardAddress(lucid: Lucid, stake: string): string;
declare function encodeAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<Data>;
declare function encodeTreasuryDatumAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<Data>;
declare const encodeTreasuryDatumTokens: (currencySymbol: string, minTokens: bigint) => Constr<Data>;
declare function encodeRoyalty(portion?: Portion): Constr<Data>;
declare function encodeWantedAsset(wantedAsset: WantedAsset): Constr<Data>;
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
    private static treasuryScriptTitle;
    private static instantBuyScriptTitle;
    private static offerScriptTitle;
    private static stakingScriptTitle;
    private jobApiUrl;
    readonly numberOfStakes: bigint;
    readonly numberOfToken: bigint;
    readonly minimumAdaAmount: bigint;
    readonly minimumJobFee: bigint;
    readonly minimumFee = 20000n;
    readonly jamTokenPolicy: string;
    readonly jamTokenName: string;
    readonly jamStakes: Map<string, Script>;
    readonly lucid: Lucid;
    readonly treasuryScript: Script;
    readonly instantBuyScript: Script;
    readonly offerScript: Script;
    readonly treasuryDatum: string;
    static getTreasuryScript(): Script;
    static getJamStakes(lucid: Lucid, policyId: PolicyId, amount: bigint, number: bigint): Map<string, Script>;
    constructor(lucid: Lucid, jobApiUrl: string, jamTokenPolicy?: string, jamTokenName?: string);
    createJobToken(): Data;
    addressToDatum(address: string): string;
    tokenToDatum(policyId: string, minTokens: bigint): string;
    sign(payload: string): Promise<SignParams>;
    payJoBToken(tx: Tx, amount: bigint): Promise<Tx>;
    squashNft(): Promise<OutRef>;
    getInstantBuyScript(): Script;
    getOfferScript(): Script;
    getTreasuryAddress(stakeId?: number): string;
    getEncodedAddress(): Promise<Constr<Data>>;
    getInstantBuyAddress(stakeId?: number): string;
    getOfferAddress(stakeId?: number): string;
    createTreasuryTx(tx: Tx, unique: number, total: number, datum: string, amount?: bigint): Tx;
    createTreasury(unique: number, total: number, datum: string, amount?: bigint): Promise<string>;
    createTreasuryAddress(address: string, unique: number, total: number, amount?: bigint): Promise<string>;
    createTreasuryToken(policyId: string, minTokens: bigint, unique: number, total: number, data: string, amount?: bigint): Promise<string>;
    getTreasuriesReserve(utxo: OutRef, affiliates: string[], force: boolean): Promise<ReservationResponse>;
    getTreasuryUtxos(plutus: string): Promise<UtxosResponse>;
    getTreasuryWithdraw(plutus: string): Promise<WithdrawResponse>;
    withdrawTreasuryTx(tx: Tx, utxos: OutRef[], datum: string, reduce?: boolean): Promise<Tx>;
    withdrawTreasuryRaw(utxos: OutRef[], datum: string, reduce?: boolean): Promise<string>;
    withdrawTreasury(plutus: string, reduce?: boolean): Promise<string>;
    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined;
    parseRoyalty(datum: Constr<any>): Portion | undefined;
    parseWantedAsset(datum: Constr<any>): WantedAsset;
    parseBeneficier(datum: Constr<any>): string;
    parseInstantbuyDatum(datumString: string): InstantBuyDatumV1;
    parseOfferDatum(datumString: string): OfferDatumV1;
    addToTreasuries(treasuries: Map<string, bigint>, datum: string, value: bigint): void;
    payToTreasuries(tx: Tx, utxo: OutRef, payToTreasuries: Map<string, bigint>, force: boolean): Promise<Tx>;
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
    registerStakeTx(tx: Tx, stake: string): Tx;
    registerStakes(stakes: string[]): Promise<string>;
    delegateTx(tx: Tx, stake: string, poolId: string): Tx;
    delegate(stake: string, poolId: string): Promise<string>;
    withdrawTx(tx: Tx, stake: string, amount: bigint): Tx;
    withdraw(stake: string, amount: bigint): Promise<string>;
    addJobTokens(tx: Tx): Promise<Tx>;
    finishTx(tx: Tx): Promise<string>;
}

export { type InstantBuyDatumV1, JamOnBreadAdminV1, type OfferDatumV1, type Portion, type ReservationResponse, type SignParams, type UtxosResponse, type WantedAsset, type WithdrawResponse, applyCodeParamas, encodeAddress, encodeRoyalty, encodeTreasuryDatumAddress, encodeTreasuryDatumTokens, encodeWantedAsset, getCompiledCode, getCompiledCodeParams, getRewardAddress, getValidator, mintUniqueAsset, version };
