/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

import { C, Lucid, ScriptType, Network, networkToId } from "lucid-cardano";
import {
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
    ScriptHash,
    Transaction,
    TxHash,
    Unit,
    UTxO,
} from "lucid-cardano";

export type ScriptResponse = {
    kind: ScriptType,
    hash: ScriptHash,
    hex: string,
    outRef?: OutRef
}

export type ContractResponse = {
    script: ScriptResponse,
    utxo: UTxO,
    price: number,
    royalty: number,
    totalPrice: number
}

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
        datumHash: utxo.datumHash?.toLowerCase(),
        datum: utxo.datum?.toLowerCase(),
        assets,
        scriptRef: transformScript(utxo)
    } as UTxO
    return result
}

function transformUtxos(utxos: UTxO[]): UTxO[] {
    return utxos.map(utxo => transformUtxo(utxo))
}

export class JamOnBreadProvider implements Provider {
    url: string

    constructor(url: string) {
        this.url = url
    }

    async getProtocolParameters(): Promise<ProtocolParameters> {
        const result = await fetch(`${this.url}/protocol_parametres`, {
        }).then((res) => res.json())

        const parameters = {
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
        }
        return parameters
    }

    async getUtxos(addressOrCredential: Address | Credential): Promise<UTxO[]> {
        const queryPredicate = (() => {
            if (typeof addressOrCredential === "string") return addressOrCredential;
            return addressOrCredential.hash
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
            return addressOrCredential.hash;
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
        const url = `${this.url}/delegation/${rewardAddress}`
        const result = await fetch(
            url,
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            }
        ).then((res) => res.json())
        return result;
    }

    async getDatum(hash: DatumHash): Promise<Datum> {
        const datum = await fetch(
            `${this.url}/datum/${hash}`,
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            },
        )
            .then((res) => res.json())
            .then((res) => res.datum.hex);
        if (!datum || datum.error) {
            throw new Error(`No datum found for datum hash: ${hash}`);
        }
        return datum;
    }

    async getScript(hash: ScriptHash): Promise<ScriptResponse> {
        const script = await fetch(
            `${this.url}/script/${hash}`,
            {
                method: 'GET',
                headers: { "Content-Type": "application/json" }
            },
        )
            .then((res) => res.json())
            .then((res) => res.script)

        if (!script || script.error) {
            throw new Error(`No script found for hash: ${hash}`);
        }
        return script as ScriptResponse
    }

    async getContract(outRef: OutRef): Promise<ContractResponse> {
        const contract = await fetch(
            `${this.url}/contract`,
            {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outRef })
            },
        )
            .then((res) => res.json())
            .then((res) => res.contract);

        if (!contract || contract.error) {
            throw new Error(`No contract found for OutRef: ${outRef}`);
        }
        return {
            script: contract.script,
            utxo: transformUtxo(contract.utxo),
            price: contract.price,
            royalty: contract.royalty,
            totalPrice: contract.totalPrice
        }
    }

    awaitTx(txHash: TxHash, checkInterval = 3000): Promise<boolean> {
        return new Promise((res) => {
            const confirmation = setInterval(async () => {
                const isConfirmed = await fetch(`${this.url}/transaction_exists/${txHash}`, {
                    method: 'GET',
                    headers: { "Content-Type": "application/json" },
                }).then((res) => res.json())
                    .then((res) => res);

                if (isConfirmed.exists && !isConfirmed.error) {
                    clearInterval(confirmation);
                    await new Promise((res) => setTimeout(() => res(1), checkInterval));
                    return res(true);
                }
            }, checkInterval);
        });
    }

    async submitTx(tx: Transaction): Promise<TxHash> {
        const url = `${this.url}/submit`
        const result = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cbor: tx }),
        }).then((res) => res.json());
        if (!result || result.error) {
            if (result?.status_code === 400) {
                throw new Error(result.message)
            }
            else {
                throw new Error("Could not submit transaction.")
            }
        }
        return result.hash;
    }
}