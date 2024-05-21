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

import { Tx, OutRef, Assets, Unit, Lucid, UTxO, Data } from "lucid-cardano"
import { JobCardano } from "../index"
import { ScriptStore } from "../definitions"

type Spend = {
    utxo: UTxO,
    redeemer: string | undefined
}

type Pay = {
    address: string
    assets: Assets
    datum: string | undefined
}

type Scripts = Record<string, string>

export class Transaction {
    private job: JobCardano
    private tx: Tx
    private refList: UTxO[]
    private spendList: Spend[]
    private payToList: Pay[]
    private payToAddList: Pay[]
    private signList: string[]

    constructor(
        job: JobCardano,
        tx?: Tx,
        refList?: UTxO[],
        spendList?: Spend[],
        payToList?: Pay[],
        payToAddList?: Pay[],
        signList?: string[]
    ) {
        this.job = job
        this.tx = tx || job.lucid.newTx()
        this.refList = refList || []
        this.spendList = spendList || []
        this.payToList = payToList || []
        this.payToAddList = payToAddList || []
        this.signList = signList || []
    }

    read(utxo: UTxO) {
        const refList = this.refList.concat([utxo])
        return new Transaction(this.job, this.tx, refList, this.spendList, this.payToList, this.payToAddList, this.signList)
    }

    // Add UTxO to spend list
    spend(utxo: UTxO, redeemer: string | undefined): Transaction {
        // Ensure lowercase
        redeemer = typeof redeemer === 'string' ? redeemer.toLowerCase() : Data.void()
        const spend: Spend = { utxo, redeemer }
        const spendList = this.spendList.concat([spend])
        return new Transaction(this.job, this.tx, this.refList, spendList, this.payToList, this.payToAddList, this.signList)
    }

    // Pay to address with datum and assets
    payTo(address: string, assets: Assets, datum?: string): Transaction {
        const payToList = this.payToList.concat([{
            address,
            assets,
            datum
        }])
        return new Transaction(this.job, this.tx, this.refList, this.spendList, payToList, this.payToAddList, this.signList)
    }

    // Add payment to existing payout
    payToAdd(address: string, assets: Assets, datum?: string): Transaction {
        const payToAddList = this.payToAddList.concat([])
        let pay = payToAddList.find((p) => p.address == address && p.datum == datum)
        if (pay) {
            const newAssets: Assets = {}
            for (let asset in assets) {
                newAssets[asset] = (newAssets[asset] || 0n) + assets[asset]
            }
            for (let asset in pay.assets) {
                newAssets[asset] = (newAssets[asset] || 0n) + pay.assets[asset]
            }
            pay.assets = newAssets
        } else {
            payToAddList.push({
                address,
                assets,
                datum
            })
        }
        return new Transaction(this.job, this.tx, this.refList, this.spendList, this.payToList, payToAddList, this.signList)
    }

    sign(address: string): Transaction {
        return new Transaction(this.job, this.tx, this.refList, this.spendList, this.payToList, this.payToAddList, this.signList.concat([address]))
    }

    // Finish transaction and return Lucid.Tx
    async lucid(): Promise<Tx> {
        let tx = this.tx

        // Add read part
        tx = tx.readFrom(this.refList)

        // Add spend part
        const scripts: Record<string, ScriptStore> = {}
        for (let spend of this.spendList) {
            const paymentCredential = this.job.lucid.utils.paymentCredentialOf(spend.utxo.address)
            tx = tx.collectFrom([spend.utxo], spend.redeemer)
            const script = await this.job.getScript(paymentCredential.hash)
            scripts[paymentCredential.hash] = script
        }

        // Add pay part
        for (let pay of this.outputs) {
            // Todo: this check for contract address is not ideal
            console.log("ADDRESS", pay)

            const paymentCredential = this.job.lucid.utils.paymentCredentialOf(pay.address)
            if (paymentCredential.type === "Script" && typeof pay.datum !== 'undefined') {
                tx = tx.payToContract(pay.address, { inline: pay.datum }, pay.assets)
            }
            else if (typeof pay.datum !== 'undefined') {
                tx = tx.payToAddressWithData(pay.address, { inline: pay.datum }, pay.assets)
            }
            else {
                tx = tx.payToAddress(pay.address, pay.assets)
            }
        }

        // Attach script validators to transaction
        for (let script of Object.values(scripts)) {
            // Script as ref
            if (script?.outRef) {
                const [utxo] = await this.job.lucid.utxosByOutRef([script.outRef])
                tx = tx.readFrom([utxo])
            }
            // Script is attached to transaction
            else {
                tx = tx.attachSpendingValidator(script!.script)
            }
        }
        tx = tx.addSigner(await this.job.lucid.wallet.address())
        // Add sign part
        for (let address of this.signList) {
            tx = tx.addSigner(address)
        }
        return tx
    }

    get refs(): UTxO[] {
        return this.refList.concat([])
    }

    get inputs(): Spend[] {
        return this.spendList.concat([])
    }

    get outputs(): Pay[] {
        return this.payToList.concat(this.payToAddList)
    }
}