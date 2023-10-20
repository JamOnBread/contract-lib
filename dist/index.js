import { Constr, Data, fromText, applyParamsToScript } from "lucid-cardano";
import { plutus } from "./plutus";
export function version() {
    return plutus.preamble.version;
}
export function getValidator(title) {
    for (const validator of plutus.validators) {
        if (validator.title == title) {
            return validator;
        }
    }
}
export function getCompiledCode(title) {
    return {
        type: "PlutusV2",
        script: getValidator(title).compiledCode
    };
}
export function applyCodeParamas(code, params) {
    return {
        type: "PlutusV2",
        script: applyParamsToScript(code.script, params)
    };
}
export function getCompiledCodeParams(title, params) {
    return applyCodeParamas(getCompiledCode(title), params);
}
export function getRewardAddress(lucid, stake) {
    return lucid.utils.credentialToRewardAddress(lucid.utils.scriptHashToCredential(stake));
}
export function encodeAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const paymentCredential = new Constr(0, [paymentPubKeyHex]);
    const stakingCredential = stakingPubKeyHex
        ? new Constr(0, [new Constr(0, [new Constr(0, [stakingPubKeyHex])])])
        : new Constr(1, []);
    return new Constr(0, [paymentCredential, stakingCredential]);
}
export function encodeTreasuryDatumAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex);
    return new Constr(0, [address]);
}
export const encodeTreasuryDatumTokens = (currencySymbol, minTokens) => {
    return new Constr(1, [new Constr(0, [currencySymbol, minTokens])]);
};
export function encodeRoyalty(portion) {
    return portion
        ? new Constr(0, [new Constr(0, [BigInt(portion.percent * 10000), Data.from(portion.treasury)])])
        : new Constr(1, []);
}
export function encodeWantedAsset(wantedAsset) {
    return wantedAsset.assetName ?
        new Constr(0, [new Constr(0, [wantedAsset.policyId, wantedAsset.assetName])]) :
        new Constr(1, [wantedAsset.policyId]);
}
/**
 * Mint new unique asset
 *
 * @param lucid
 * @param name
 * @param amount
 * @returns transaction hash
 */
export async function mintUniqueAsset(lucid, name, amount) {
    // Transform token name to hexa
    const tokenName = fromText(name);
    // Get first UTxO on wallet
    const [utxo, ...rest] = await lucid.utxosAt(await lucid.wallet.address());
    // Encode UTxO to transaction
    const param = new Constr(0, [new Constr(0, [utxo.txHash]), BigInt(utxo.outputIndex)]);
    // Compile code with UTxO
    const policy = getCompiledCodeParams("assets.mint_v1", [param]);
    // Hash script
    const policyId = lucid.utils.mintingPolicyToId(policy);
    // Calculate unit name
    const unit = policyId + tokenName;
    // Construct transaction
    const tx = await lucid
        .newTx()
        .collectFrom([utxo])
        .mintAssets({ [unit]: BigInt(amount) }, Data.void())
        .attachMintingPolicy(policy)
        .complete();
    // Sign & Submit transaction
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    await lucid.awaitTx(txHash);
    // Return transaction hash (awaited)
    return txHash;
}
export class JamOnBreadAdminV1 {
    static numberOfStakes = 10n;
    static numberOfToken = 1n;
    static treasuryScriptTitle = "treasury.spend_v1";
    static instantBuyScriptTitle = "instant_buy.spend_v1";
    static offerScriptTitle = "offer.spend_v1";
    static minimumAdaAmount = 2000000n;
    static minimumJobFee = 100000n;
    jamTokenPolicy = "74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a";
    jamTokenName = "556e69717565";
    jamStakes;
    lucid;
    treasuryScript;
    instantBuyScript;
    offerScript;
    treasuryDatum;
    static getTreasuryScript() {
        return getCompiledCode(JamOnBreadAdminV1.treasuryScriptTitle);
    }
    static getJamStakes(lucid, policyId, amount, number) {
        const stakes = [];
        for (let i = 1n; i <= number; i++) {
            const code = getCompiledCodeParams('staking.withdrawal_v1', [encodeTreasuryDatumTokens(policyId, amount), BigInt(i)]);
            stakes.push(lucid.utils.validatorToScriptHash(code));
        }
        return stakes;
    }
    constructor(lucid, jamTokenPolicy, jamTokenName) {
        this.lucid = lucid;
        this.jamTokenPolicy = jamTokenPolicy;
        this.jamTokenName = jamTokenName;
        this.jamStakes = JamOnBreadAdminV1.getJamStakes(lucid, this.jamTokenPolicy, JamOnBreadAdminV1.numberOfToken, JamOnBreadAdminV1.numberOfStakes);
        this.treasuryScript = JamOnBreadAdminV1.getTreasuryScript();
        this.instantBuyScript = applyCodeParamas(this.getInstantBuyScript(), [
            this.lucid.utils.validatorToScriptHash(this.treasuryScript),
            Array.from(this.jamStakes.map(stakeHash => new Constr(0, [new Constr(1, [stakeHash])]))),
            this.createJobToken()
        ]);
        this.offerScript = applyCodeParamas(this.getOfferScript(), [
            this.lucid.utils.validatorToScriptHash(this.treasuryScript),
            Array.from(this.jamStakes.map(stakeHash => new Constr(0, [new Constr(1, [stakeHash])]))),
            this.createJobToken()
        ]);
        this.treasuryDatum = this.createJobToken();
    }
    createJobToken() {
        return encodeTreasuryDatumTokens(this.jamTokenPolicy, BigInt(Math.floor(Number(JamOnBreadAdminV1.numberOfToken) / 2) + 1));
    }
    async payJoBToken(tx, amount) {
        return tx.payToAddress(await this.lucid.wallet.address(), {
            [this.jamTokenPolicy + this.jamTokenName]: amount
        });
    }
    async squashNft() {
        const utxos = await this.lucid.wallet.getUtxos();
        const assets = {
            lovelace: 0n
        };
        for (let utxo of utxos) {
            for (let asset in utxo.assets) {
                if (asset in assets) {
                    assets[asset] += BigInt(utxo.assets[asset]);
                }
                else {
                    assets[asset] = BigInt(utxo.assets[asset]);
                }
            }
        }
        assets.lovelace -= 2000000n;
        const tx = await this.lucid
            .newTx()
            .collectFrom(utxos)
            .payToAddress(await this.lucid.wallet.address(), assets)
            .complete();
        const signedTx = await tx
            .sign()
            .complete();
        const txHash = await signedTx.submit();
        return {
            txHash,
            outputIndex: 0
        };
    }
    getInstantBuyScript() {
        return getCompiledCode(JamOnBreadAdminV1.instantBuyScriptTitle);
    }
    getOfferScript() {
        return getCompiledCode(JamOnBreadAdminV1.offerScriptTitle);
    }
    getTreasuryAddress(stakeId) {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.length);
        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.treasuryScript)
        };
        const stakeCredential = {
            type: "Script",
            hash: this.jamStakes[stakeId]
        };
        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential);
    }
    async getEncodedAddress() {
        const address = await this.lucid.wallet.address();
        const payCred = this.lucid.utils.paymentCredentialOf(address);
        try {
            const stakeCred = this.lucid.utils.stakeCredentialOf(address);
            return encodeAddress(payCred.hash, stakeCred.hash);
        }
        catch (e) {
            return encodeAddress(payCred.hash);
        }
    }
    getInstantBuyAddress(stakeId) {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.length);
        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.instantBuyScript)
        };
        const stakeCredential = {
            type: "Script",
            hash: this.jamStakes[stakeId]
        };
        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential);
    }
    getOfferAddress(stakeId) {
        if (typeof stakeId === "undefined")
            stakeId = stakeId || Math.round(Math.random() * this.jamStakes.length);
        const paymentCredential = {
            type: "Script",
            hash: this.lucid.utils.validatorToScriptHash(this.offerScript)
        };
        const stakeCredential = {
            type: "Script",
            hash: this.jamStakes[stakeId]
        };
        return this.lucid.utils.credentialToAddress(paymentCredential, stakeCredential);
    }
    async getTreasuries() {
        const address = this.getTreasuryAddress(0);
        return await this.lucid.utxosAt(address);
    }
    getTreasury(treasuries, datum) {
        const index = treasuries.findIndex((value) => {
            return value.datum == datum;
        });
        if (index > -1) {
            const element = treasuries[index];
            // Removed splice
            // treasuries.splice(index, 1)
            return element;
        }
        return undefined;
    }
    parseRoyalty(datum) {
        if (datum.index == 0) {
            return {
                percent: Number(datum.fields[0].fields[0]) / 10000,
                treasury: Data.to(datum.fields[0].fields[1])
            };
        }
        else {
            return undefined;
        }
    }
    parseWantedAsset(datum) {
        if (datum.index == 0) {
            return {
                policyId: datum.fields[0],
                assetName: datum.fields[1]
            };
        }
        else {
            return {
                policyId: datum.fields[0],
                assetName: undefined
            };
        }
    }
    parseBeneficier(datum) {
        const beneficier_address = datum.fields[0].fields[0];
        const beneficier_stake = datum.fields[1].index == 0 ?
            datum.fields[1].fields[0].fields[0].fields[0]
            :
                undefined;
        const beneficier = this.lucid.utils.credentialToAddress(this.lucid.utils.keyHashToCredential(beneficier_address), beneficier_stake ? this.lucid.utils.keyHashToCredential(beneficier_stake) : undefined);
        return beneficier;
    }
    parseInstantbuyDatum(datumString) {
        const datum = Data.from(datumString);
        const beneficier = this.parseBeneficier(datum.fields[0]);
        const listingMarketDatum = Data.to(datum.fields[1]);
        const listingAffiliateDatum = datum.fields[2].index == 0 ? Data.to(datum.fields[2].fields[0]) : listingMarketDatum;
        const amount = datum.fields[3];
        const royalty = this.parseRoyalty(datum.fields[4]);
        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            royalty
        };
    }
    parseOfferDatum(datumString) {
        const datum = Data.from(datumString);
        const beneficier = this.parseBeneficier(datum.fields[0]);
        const listingMarketDatum = Data.to(datum.fields[1]);
        const listingAffiliateDatum = datum.fields[2].index == 0 ? Data.to(datum.fields[2].fields[0]) : listingMarketDatum;
        const amount = datum.fields[3];
        const wantedAsset = this.parseWantedAsset(datum.fields[4]);
        const royalty = this.parseRoyalty(datum.fields[5]);
        return {
            beneficier,
            listingMarketDatum,
            listingAffiliateDatum,
            amount,
            wantedAsset,
            royalty
        };
    }
    addToTreasuries(treasuries, datum, value) {
        if (datum in treasuries) {
            treasuries[datum] = treasuries[datum] + value;
        }
        else {
            treasuries[datum] = value;
        }
    }
    async payToTreasuries(tx, payToTreasuries, force) {
        // JoB treasury
        const allTreasuries = await this.getTreasuries();
        const collectFromTreasuries = {};
        for (let datum in payToTreasuries) {
            const treasury = this.getTreasury(allTreasuries, datum);
            collectFromTreasuries[datum] = treasury;
        }
        tx = tx.collectFrom(Object.values(collectFromTreasuries), Data.void());
        console.debug("Pay to treasuries", payToTreasuries);
        // Pay to treasuries
        for (let datum in collectFromTreasuries) {
            const treasury = collectFromTreasuries[datum];
            tx = tx.payToContract(treasury.address, { inline: treasury.datum }, { lovelace: BigInt(treasury.assets.lovelace) + BigInt(payToTreasuries[datum]) });
        }
        tx = tx.attachSpendingValidator(this.treasuryScript);
        return tx;
    }
    async instantBuyListTx(tx, unit, price, listing, affiliate, royalty) {
        if (typeof listing == "undefined") {
            listing = Data.to(this.treasuryDatum);
        }
        const sellerAddr = await this.getEncodedAddress();
        const datum = new Constr(0, [
            sellerAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            encodeRoyalty(royalty)
        ]);
        tx = tx.payToContract(this.getInstantBuyAddress(), { inline: Data.to(datum) }, {
            [unit]: BigInt(1),
            lovelace: JamOnBreadAdminV1.minimumAdaAmount
        });
        return tx;
    }
    async instantbuyList(unit, price, listing, affiliate, royalty) {
        let txList = this.lucid.newTx();
        txList = await this.instantBuyListTx(txList, unit, price, listing, affiliate, royalty);
        return await this.finishTx(txList);
    }
    async instantBuyCancelTx(tx, utxo) {
        const toSpend = await this.lucid.utxosByOutRef([utxo]);
        tx = tx
            .collectFrom(toSpend, Data.to(new Constr(1, [])))
            .attachSpendingValidator(this.instantBuyScript)
            .addSigner(await this.lucid.wallet.address());
        return tx;
    }
    async instantBuyCancel(utxo) {
        let txCancel = this.lucid.newTx();
        txCancel = await this.instantBuyCancelTx(txCancel, utxo);
        return await this.finishTx(txCancel);
    }
    async instantBuyUpdateTx(tx, unit, price, listing, affiliate, royalty) {
        const toSpend = await this.lucid.utxoByUnit(unit);
        tx = await this.instantBuyCancelTx(tx, {
            txHash: toSpend.txHash,
            outputIndex: toSpend.outputIndex
        });
        tx = await this.instantBuyListTx(tx, unit, price, listing, affiliate, royalty);
        return tx;
    }
    async instantBuyUpdate(unit, price, listing, affiliate, royalty) {
        let txUpdate = this.lucid.newTx();
        txUpdate = await this.instantBuyUpdateTx(txUpdate, unit, price, listing, affiliate, royalty);
        return await this.finishTx(txUpdate);
    }
    async instantBuyProceed(utxo, force = false, ...sellMarketPortions) {
        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ]);
        const params = this.parseInstantbuyDatum(collectUtxo.datum);
        const provision = 0.025 * Number(params.amount);
        console.debug("Instant buy", params);
        const payToTreasuries = {
            [Data.to(this.treasuryDatum)]: BigInt(Math.max(Math.ceil(provision * 0.1), Number(JamOnBreadAdminV1.minimumJobFee)))
        };
        this.addToTreasuries(payToTreasuries, params.listingMarketDatum, BigInt(Math.ceil(Number(provision) * 0.2)));
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum, BigInt(Math.ceil(Number(provision) * 0.2)));
        for (let portion of sellMarketPortions) {
            this.addToTreasuries(payToTreasuries, portion.treasury, BigInt(Math.ceil(Number(provision) * 0.5 * portion.percent)));
        }
        if (params.royalty) {
            this.addToTreasuries(payToTreasuries, params.royalty.treasury, BigInt(Math.ceil(Number(params.amount) * params.royalty.percent)));
        }
        const buyRedeemer = Data.to(new Constr(0, [
            sellMarketPortions.map(portion => new Constr(0, [
                BigInt(Math.ceil(portion.percent * 10000)),
                Data.from(portion.treasury)
            ]))
        ]));
        let buildTx = this.lucid
            .newTx()
            // TODO: To test big portion of assets
            //.collectFrom(await this.lucid.wallet.getUtxos()) 
            .collectFrom([
            collectUtxo
        ], buyRedeemer)
            .attachSpendingValidator(this.instantBuyScript);
        buildTx = buildTx.payToAddress(params.beneficier, { lovelace: params.amount + collectUtxo.assets.lovelace });
        buildTx = await this.payToTreasuries(buildTx, payToTreasuries, false);
        return await this.finishTx(buildTx);
    }
    async offerListTx(tx, asset, price, listing, affiliate, royalty) {
        if (typeof listing == "undefined") {
            listing = Data.to(this.treasuryDatum);
        }
        const offererAddr = await this.getEncodedAddress();
        const datum = new Constr(0, [
            offererAddr,
            Data.from(listing),
            affiliate ? new Constr(0, [Data.from(affiliate)]) : new Constr(1, []),
            price,
            encodeWantedAsset(asset),
            encodeRoyalty(royalty)
        ]);
        tx = tx.payToContract(this.getOfferAddress(), { inline: Data.to(datum) }, {
            lovelace: JamOnBreadAdminV1.minimumAdaAmount + price
        });
        return tx;
    }
    async offerList(asset, price, listing, affiliate, royalty) {
        let txList = this.lucid.newTx();
        txList = await this.offerListTx(txList, asset, price, listing, affiliate, royalty);
        return {
            txHash: await this.finishTx(txList),
            outputIndex: 0
        };
    }
    async offerCancelTx(tx, utxo) {
        const toSpend = await this.lucid.utxosByOutRef([utxo]);
        tx = tx
            .collectFrom(toSpend, Data.to(new Constr(1, [])))
            .attachSpendingValidator(this.offerScript)
            .addSigner(await this.lucid.wallet.address());
        return tx;
    }
    async offerCancel(utxo) {
        let txCancel = this.lucid.newTx();
        txCancel = await this.offerCancelTx(txCancel, utxo);
        return await this.finishTx(txCancel);
    }
    async offerUpdateTx(tx, utxo, asset, price, listing, affiliate, royalty) {
        tx = await this.offerCancelTx(tx, utxo);
        tx = await this.offerListTx(tx, asset, price, listing, affiliate, royalty);
        return tx;
    }
    async offerUpdate(utxo, asset, price, listing, affiliate, royalty) {
        let txUpdate = this.lucid.newTx();
        txUpdate = await this.offerUpdateTx(txUpdate, utxo, asset, price, listing, affiliate, royalty);
        return await this.finishTx(txUpdate);
    }
    async offerProceed(utxo, unit, force = false, ...sellMarketPortions) {
        const [collectUtxo] = await this.lucid.utxosByOutRef([
            utxo
        ]);
        const params = this.parseOfferDatum(collectUtxo.datum);
        const provision = 0.025 * Number(params.amount);
        console.debug("Offer", params);
        const payToTreasuries = {
            [Data.to(this.treasuryDatum)]: BigInt(Math.max(Math.ceil(provision * 0.1), Number(JamOnBreadAdminV1.minimumJobFee)))
        };
        this.addToTreasuries(payToTreasuries, params.listingMarketDatum, BigInt(Math.ceil(Number(provision) * 0.2)));
        this.addToTreasuries(payToTreasuries, params.listingAffiliateDatum, BigInt(Math.ceil(Number(provision) * 0.2)));
        for (let portion of sellMarketPortions) {
            this.addToTreasuries(payToTreasuries, portion.treasury, BigInt(Math.ceil(Number(provision) * 0.5 * portion.percent)));
        }
        if (params.royalty) {
            this.addToTreasuries(payToTreasuries, params.royalty.treasury, BigInt(Math.ceil(Number(params.amount) * params.royalty.percent)));
        }
        const buyRedeemer = Data.to(new Constr(0, [
            sellMarketPortions.map(portion => new Constr(0, [
                BigInt(Math.ceil(portion.percent * 10000)),
                Data.from(portion.treasury)
            ]))
        ]));
        let buildTx = this.lucid
            .newTx()
            // TODO: To test big portion of assets
            //.collectFrom(await this.lucid.wallet.getUtxos()) 
            .collectFrom([
            collectUtxo
        ], buyRedeemer)
            .attachSpendingValidator(this.offerScript);
        buildTx = buildTx.payToAddress(params.beneficier, {
            lovelace: JamOnBreadAdminV1.minimumAdaAmount,
            [unit]: 1n
        });
        buildTx = await this.payToTreasuries(buildTx, payToTreasuries, false);
        return await this.finishTx(buildTx);
    }
    async finishTx(tx) {
        const txComplete = await tx.complete();
        const signedTx = await txComplete.sign().complete();
        const txHash = await signedTx.submit();
        return txHash;
    }
}
/*

const privKey = "ed25519_sk1z5zd4ap8nyyvlh2uz5rt08xh76yjhs0v7yv58vh00z399m3vrppqfhxv0n" // Treaury
//const privKey = "ed25519_sk1vmcvrrew9ppggulj08e9lg5w333t58qy2pmylprz4lg2ka0887kqz5zurk" // Test
const lucid = await Lucid.new(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", "preprodVm9mYgzOYXlfFrFYfgJ2Glz7AlnMjvV9"),
    "Preprod",
)
lucid.selectWalletFromPrivateKey(privKey)



const job = new JamOnBreadAdminV1(lucid, "74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a", "556e69717565")
const asset = {
    policyId: "b1ecd813e9084e3592d0986c41b63197fe2eb8e8994c4269933f8363",
    assetName: "4a6f42566572696669636174696f6e"
} as WantedAsset
const unit = asset.policyId + asset.assetName

// console.log(await job.getTreasuries())
// console.log(await job.squashNft())
console.log(await lucid.wallet.address())

const portions = [
    {
        percent: 0.2,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vz6r5aetvn6m6y8lax7zlx9dl7hnfm53q4njwzdcyzqmzdct4jjws").hash
        ))
    },
    {
        percent: 0.2,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vz695rlavrxv8wm2r7ur6skp5f3gtkx3xsqk20gpvest92qd42p39").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr0yzzjnsnxpkf48n56s5jp06df2tx4dylch7j2zwm0tnrcwrmc4c").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqrmaa655rtcxu5lg9nd7tph6wxzq5su646nmweuh798ayqa4z4hc").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vplh9cjn8vhmzn7qs8ynv7aea3t567a9w4lagetrf896q3q0xamca").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr6v0wmlzs8xashkqdpm9k47l0q9aek0mucef273ky2xuhcfwqj92").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqxzql8rxfxefdzjz9t6rdnly0lrffcngk9wy29c6l6j7sss5m2p6").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr49pv7cpft4fekwg7atl4lv7fc839u72fkc9v39e0x3svcmytec9").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqcg5dsaz9kq8n7nj8kpkr8yvpst3me4qzpzpcwkh8sexhc7n5pm7").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vrhvvu6kn96f05ucldwlmdg46djdrerrat4qqc28xaj44kcz8j4sd").hash
        ))
    }]

/*
console.log(
    await job.instantbuyList(
        unit,
        10_000_000n,
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vp54hwj38ykwyvek6vdkug6flwrdtwuazqlwuqngzw5deks388fd7").hash
        )),
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vry4ww84sje8lmvw35glqgkdt6ahzdz04x8yqkfmpt5t3xcrve047").hash
        )),
        {percent: 0.1, treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vrelgt8camtmzktcykamyh8rgpq5sutueeawpzwykwpdujq05epfh").hash
        ))} as Portion
    )
)
*/
/*
console.log(await job.instantBuyCancel({
    txHash: "db0f647a8e3685da088a0003b249fc658e14cde6a8a1ab39cec06935317d9c90",
    outputIndex: 0
}))
*/
/*
console.log(await job.instantBuyProceed(
    {
        txHash: "0db4ecea71e76926635b84870d363b557599abf73e69d1d82c9045f5cc8ea760",
        outputIndex: 0
    },
    false,
    ...portions.slice(0, 5)
))
*/
/*
console.log(
    await job.offerList(
        asset,
        10_000_000n,
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vp54hwj38ykwyvek6vdkug6flwrdtwuazqlwuqngzw5deks388fd7").hash
        )),
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vry4ww84sje8lmvw35glqgkdt6ahzdz04x8yqkfmpt5t3xcrve047").hash
        )),
        {
            percent: 0.1, treasury: Data.to(encodeTreasuryDatumAddress(
                lucid.utils.paymentCredentialOf("addr_test1vrelgt8camtmzktcykamyh8rgpq5sutueeawpzwykwpdujq05epfh").hash
            ))
        } as Portion
    )
)
*/
/*
console.log(await job.offerCancel({
    txHash: "903ae426984c49586be01132f8c5ed0e7db3363f74c4e1820c32d396a8c621ea",
    outputIndex: 0
}))
*/
/*
console.log(await job.offerProceed(
    {
        txHash: "ef0aa11cbfa22359623fbdaee32464513c82313dcd3b57130a92821ed0d060c7",
        outputIndex: 0
    },
    unit,
    false,
    ...portions.slice(0, 5)
))
*/
// console.log(job.getTreasuryAddress(0))
//# sourceMappingURL=index.js.map