import { Lucid, Script, Constr, Data, PolicyId, Unit, fromText, Tx, UTxO, OutRef, Credential, applyParamsToScript } from "lucid-cardano"
import { Portion, WantedAsset } from "./types"
import { plutus } from "./plutus"

export function version(): string {
    return plutus.preamble.version
}

export function getValidator(title: string): any {
    for (const validator of plutus.validators) {
        if (validator.title == title) {
            return validator
        }
    }
}

export function getCompiledCode(title: string): Script {
    return {
        type: "PlutusV2",
        script: getValidator(title).compiledCode
    }
}

export function applyCodeParamas(code: Script, params: any): Script {
    return {
        type: "PlutusV2",
        script: applyParamsToScript(
            code.script,
            params
        )
    }
}

export function getCompiledCodeParams(title: string, params: any): Script {
    return applyCodeParamas(getCompiledCode(title), params)
}


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

/**
 * Mint new unique asset
 *
 * @param lucid
 * @param name
 * @param amount
 * @returns transaction hash
 */
export async function mintUniqueAsset(lucid: Lucid, name: string, amount: bigint): Promise<string> {
    // Transform token name to hexa
    const tokenName = fromText(name)
    // Get first UTxO on wallet
    const [utxo, ...rest] = await lucid.utxosAt(await lucid.wallet.address())
    // Encode UTxO to transaction
    const param = new Constr(0, [new Constr(0, [utxo.txHash]), BigInt(utxo.outputIndex)])
    // Compile code with UTxO
    const policy = getCompiledCodeParams("assets.mint_v1", [param])
    // Hash script
    const policyId: PolicyId = lucid.utils.mintingPolicyToId(policy)
    // Calculate unit name
    const unit: Unit = policyId + tokenName;

    // Construct transaction
    const tx = await lucid
        .newTx()
        .collectFrom([utxo])
        .mintAssets(
            { [unit]: BigInt(amount) },
            Data.void()
        )
        .attachMintingPolicy(policy)

        .complete();

    // Sign & Submit transaction
    const signedTx = await tx.sign().complete()
    const txHash = await signedTx.submit()
    await lucid.awaitTx(txHash)

    // Return transaction hash (awaited)
    return txHash
}