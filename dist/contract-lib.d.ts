import { OutRef, Lucid, Tx, UTxO, Constr, Data, Unit } from 'lucid-cardano';

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
declare enum Lock {
    Locked = 0,
    Partial = 1,
    Blocked = 2,
    Error = 3
}

declare enum ContractType {
    Unknown = 0,
    JobTreasury = 1,
    JobInstantBuy = 2,
    JobOffer = 3,
    JobStake = 4,
    JobLock = 5,
    JPG = 6
}
interface Contract {
    type: ContractType;
    active: boolean;
    hash: string;
    treasury?: Contract;
    collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx>;
    attachTx(lucid: Lucid, tx: Tx): Promise<Tx>;
    parseDatum(lucid: Lucid, datum: string): any;
}
declare class ContractBase implements Contract {
    readonly type: ContractType;
    readonly active: boolean;
    readonly hash: string;
    readonly treasury?: Contract;
    private ref?;
    private script?;
    private utxo?;
    constructor(type: ContractType, active: boolean, hash: string, ref?: OutRef, script?: string, tresury?: Contract);
    getUtxo(lucid: Lucid): Promise<UTxO | undefined>;
    collectTx(lucid: Lucid, tx: Tx, utxo: UTxO, redeemer: string | undefined): Promise<Tx>;
    attachTx(lucid: Lucid, tx: Tx): Promise<Tx>;
    parseDatum(lucid: Lucid, datum: string): void;
}
declare class Context {
    readonly jobTokenPolicy: string;
    readonly jobTokenName: string;
    readonly numberOfToken: number;
    readonly minimumAdaAmount: bigint;
    readonly minimumJobFee: bigint;
    readonly minimumFee = 20000n;
    readonly contracts: Contract[];
    readonly stakes: string[];
    constructor(jobTokenPolicy: string, jobTokenName: string, numberOfToken: number, contracts: Contract[], stakes: string[]);
    getContractByHash(hash: string): Contract;
    getContractByAddress(address: string): Contract;
    getContract(type: ContractType): Contract;
    getStakeNumber(): number;
    getStake(stakeId?: number): string;
    getContractAddress(lucid: Lucid, contract: Contract, stakeId?: number): string;
}

declare function encodeAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<Data>;
declare function encodeTreasuryDatumAddress(paymentPubKeyHex: string, stakingPubKeyHex?: string): Constr<Data>;
declare const encodeTreasuryDatumTokens: (currencySymbol: string, minTokens: bigint) => Constr<Data>;
declare function encodeRoyalty(portion?: Portion): Constr<Data>;
declare function encodeWantedAsset(wantedAsset: WantedAsset): Constr<Data>;

declare class Job {
    readonly context: Context;
    private jobApiUrl;
    readonly numberOfStakes: bigint;
    readonly numberOfToken: bigint;
    readonly treasuryDatum: string;
    readonly lucid: Lucid;
    constructor(lucid: Lucid, jobApiUrl: string);
    addressToDatum(address: string): string;
    tokenToDatum(policyId: string, minTokens: bigint): string;
    sign(payload: string): Promise<SignParams>;
    payJoBToken(tx: Tx, amount?: bigint): Promise<Tx>;
    squashNft(): Promise<OutRef>;
    getEncodedAddress(address?: string): Promise<Constr<Data>>;
    getTreasuryAddress(stakeId?: number): string;
    getInstantBuyAddress(stakeId?: number): string;
    getOfferAddress(stakeId?: number): string;
    createTreasuryTx(tx: Tx, unique: number, total: number, datum: string, amount?: bigint): Tx;
    createTreasury(unique: number, total: number, datum: string, amount?: bigint): Promise<string>;
    createTreasuryAddress(address: string, unique: number, total: number, amount?: bigint): Promise<string>;
    createTreasuryToken(policyId: string, minTokens: bigint, unique: number, total: number, data: string, amount?: bigint): Promise<string>;
    getTreasuriesReserve(utxo: OutRef, affiliates: string[], force: boolean): Promise<ReservationResponse>;
    getTreasuryUtxos(plutus: string): Promise<UtxosResponse>;
    getTreasuryWithdraw(plutus: string): Promise<WithdrawResponse>;
    getAffiliates(utxo: UTxO, treasuries: Portion[]): string[];
    lockContract(unit: Unit, ...treasuries: Portion[]): Promise<Lock>;
    withdrawTreasuryTx(tx: Tx, utxos: OutRef[], datum: string, reduce?: boolean): Promise<Tx>;
    withdrawTreasuryRaw(utxos: OutRef[], datum: string, reduce?: boolean): Promise<string>;
    withdrawTreasury(plutus: string, reduce?: boolean): Promise<string>;
    getTreasury(treasuries: UTxO[], datum: string): UTxO | undefined;
    addToTreasuries(treasuries: Map<string, bigint>, datum: string, value: bigint): void;
    payToTreasuries(tx: Tx, contract: Contract, utxo: OutRef, payToTreasuries: Map<string, bigint>, force: boolean): Promise<Tx>;
    instantBuyListTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    instantbuyList(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string>;
    instantBuyCancelTx(tx: Tx, utxo: UTxO | OutRef): Promise<Tx>;
    instantBuyCancel(utxo: OutRef): Promise<string>;
    instantBuyUpdateTx(tx: Tx, unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<Tx>;
    instantBuyUpdate(unit: Unit, price: bigint, listing?: string, affiliate?: string, royalty?: Portion): Promise<string>;
    instantBuyProceedTx(tx: Tx, utxo: OutRef, force?: boolean, ...sellMarketPortions: Portion[]): Promise<Tx>;
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
    offerProceedTx(tx: Tx, utxo: OutRef, unit: Unit, force?: boolean, ...sellMarketPortions: Portion[]): Promise<Tx>;
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

export { Context, type Contract, ContractBase, ContractType, type InstantBuyDatumV1, Job, Lock, type OfferDatumV1, type Portion, type ReservationResponse, type SignParams, type UtxosResponse, type WantedAsset, type WithdrawResponse, encodeAddress, encodeRoyalty, encodeTreasuryDatumAddress, encodeTreasuryDatumTokens, encodeWantedAsset };
