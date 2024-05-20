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

import { JobCardano, JamOnBreadProvider, Portion } from "@jamonbread/sdk";
import { Lucid, OutRef, PolicyId, Unit } from "lucid-cardano";

// Setup basic environment
const url = "http://localhost:5000/api"
export const provider = new JamOnBreadProvider(`${url}/lucid`)
export const network = "Preprod"
export const privKey = process.env.PRIV_KEY1! // Treaury
export const lucid = await Lucid.new(
    provider,
    network,
)
console.log(privKey)
lucid.selectWalletFromPrivateKey(privKey)
export const job = new JobCardano(lucid, url)

// defined unit/Utxo
const address = await lucid.wallet.address()
export const marketTreasury = "d87a9fd8799f581c74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a0affff"
export const affiliateTreasury = "d87a9fd8799f581c74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a01ffff"

export const policyId: PolicyId = "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737"
export const assetName = "4d696b7361546865467574757265"
export const unit: Unit = policyId + assetName
export const outRef: OutRef = {
    txHash: "eff48ee2d9a5f87d43b31f337c7ab46c0a8f7fcfb8b2e19ccf40eb8d26441e1c",
    outputIndex: 0
}

console.log(`Shared information loaded successfully, address: ${address}, cred: ${lucid.utils.paymentCredentialOf(address).hash}`)

