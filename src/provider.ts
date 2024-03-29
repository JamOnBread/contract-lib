import { C } from "lucid-cardano";
import {
    applyDoubleCborEncoding,
    Address,
    Assets,
    Credential,
    Datum,
    DatumHash,
    Delegation,
    fromHex,
    OutRef,
    ProtocolParameters,
    Provider,
    RewardAddress,
    Script,
    Transaction,
    TxHash,
    Unit,
    UTxO,
} from "lucid-cardano";



function transformScript(utxo: any): Script | undefined {
    if (utxo.script) {
        const script: Script = {
            type: utxo.scriptType === "plutusV1" ? "PlutusV1" : "PlutusV2",
            script: utxo.script
        }
        return script
    }
    return undefined
}

function transformUtxo(utxo: any): UTxO {
    const assets: Assets = {};
    Object.keys(utxo.assets).forEach(key => assets[key.toLowerCase()] = BigInt(utxo.assets[key]))

    const result = {
        txHash: utxo.txHash.toLowerCase(),
        outputIndex: utxo.outputIndex,
        address: utxo.address.toLowerCase(),
        datumHash: utxo.datumHash.toLowerCase(),
        datum: utxo.datum.toLowerCase(),
        assets,
        scriptRef: transformScript(utxo)
    } as UTxO
    return result
}

function transformUtxos(utxos: UTxO[]): UTxO[] {
    return utxos.map(utxo => transformUtxo(utxo))
}

export class JamOnBreadProvider implements Provider {
    url: string;

    constructor(url: string) {
        this.url = url;
    }

    async getProtocolParameters(): Promise<ProtocolParameters> {
        const result = await fetch(`${this.url}/protocol_parametres`, {
        }).then((res) => res.json());

        return {
            minFeeA: parseInt(result.minFeeA),
            minFeeB: parseInt(result.minFeeB),
            maxTxSize: parseInt(result.maxTxSize),
            maxValSize: parseInt(result.maxValSize),
            keyDeposit: BigInt(result.keyDeposit),
            poolDeposit: BigInt(result.poolDeposit),
            priceMem: parseFloat(result.priceMem),
            priceStep: parseFloat(result.priceStep),
            maxTxExMem: BigInt(result.maxTxExMem),
            maxTxExSteps: BigInt(result.maxTxExSteps),
            coinsPerUtxoByte: BigInt(result.coinsPerUtxoByte),
            collateralPercentage: parseInt(result.collateralPercentage),
            maxCollateralInputs: parseInt(result.maxCollateralInputs),
            costModels: result.costModels,
        };
    }

    async getUtxos(addressOrCredential: Address | Credential): Promise<UTxO[]> {
        const queryPredicate = (() => {
            if (typeof addressOrCredential === "string") return addressOrCredential;
            const credentialBech32 = addressOrCredential.type === "Key"
                ? C.Ed25519KeyHash.from_hex(addressOrCredential.hash).to_bech32(
                    "addr_vkh",
                )
                : C.ScriptHash.from_hex(addressOrCredential.hash).to_bech32(
                    "addr_vkh",
                ); // should be 'script' (CIP-0005)
            return credentialBech32;
        })();
        const result =
            await fetch(
                `${this.url}/utxos_by_addresses`,
                {
                    method: 'POST',
                    body: JSON.stringify({ addresses: [queryPredicate] }),
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            ).then((res) => res.json());

        return transformUtxos(result.utxos);
    }

    async getUtxosWithUnit(
        addressOrCredential: Address | Credential,
        unit: Unit,
    ): Promise<UTxO[]> {
        const queryPredicate = (() => {
            if (typeof addressOrCredential === "string") return addressOrCredential;
            const credentialBech32 = addressOrCredential.type === "Key"
                ? C.Ed25519KeyHash.from_hex(addressOrCredential.hash).to_bech32(
                    "addr_vkh",
                )
                : C.ScriptHash.from_hex(addressOrCredential.hash).to_bech32(
                    "addr_vkh",
                ); // should be 'script' (CIP-0005)
            return credentialBech32;
        })();
        const result =
            await fetch(
                `${this.url}/utxos_by_address_with_unit`,
                {
                    method: 'POST',
                    body: JSON.stringify({ address: queryPredicate, unit }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            ).then((res) => res.json());

        return transformUtxos(result.utxos);
    }

    async getUtxoByUnit(unit: Unit): Promise<UTxO> {
        const result = await fetch(
            `${this.url}/utxos_by_units`,
            {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ units: [unit] }),
            }
        ).then((res) => res.json());

        if (result.utxos.length > 1) {
            throw new Error("Unit needs to be an NFT or only held by one address.");
        }

        return transformUtxo(result.utxos[0])
    }

    async getUtxosByOutRef(outRefs: OutRef[]): Promise<UTxO[]> {
        const result = await fetch(
            `${this.url}/utxos_by_outrefs`,
            {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    outRefs: outRefs.map(outRef => ({
                        txHash: outRef.txHash,
                        outputIndex: Number(outRef.outputIndex)
                    }))
                })
            }
        ).then((res) => res.json())

        return transformUtxos(result.utxos)
    }

    async getDelegation(rewardAddress: RewardAddress): Promise<Delegation> {
        const result = await fetch(
            `${this.url}/delegation`,
            {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rewardAddress),
            }
        ).then((res) => res.json());
        return result;
    }

    async getDatum(datumHash: DatumHash): Promise<Datum> {
        const datum = await fetch(
            `${this.url}/datum`,
            {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datumHash),
            },
        )
            .then((res) => res.json())
            .then((res) => res.cbor);
        if (!datum || datum.error) {
            throw new Error(`No datum found for datum hash: ${datumHash}`);
        }
        return datum;
    }

    awaitTx(txHash: TxHash, checkInterval = 3000): Promise<boolean> {
        return new Promise((res) => {
            const confirmation = setInterval(async () => {
                const isConfirmed = await fetch(`${this.url}/transaction_exists`, {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ txHash: txHash }),
                }).then((res) => res.json());

                if (isConfirmed.exists && !isConfirmed.error) {
                    clearInterval(confirmation);
                    await new Promise((res) => setTimeout(() => res(1), checkInterval));
                    return res(true);
                }
            }, checkInterval);
        });
    }

    async submitTx(tx: Transaction): Promise<TxHash> {
        const result = await fetch(`${this.url}/transaction_submit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tx),
        }).then((res) => res.json());
        if (!result || result.error) {
            if (result?.status_code === 400) throw new Error(result.message);
            else throw new Error("Could not submit transaction.");
        }
        return result;
    }
}