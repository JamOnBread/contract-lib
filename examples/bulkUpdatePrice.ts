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

// @ts-ignore
import { Portion } from "@jamonbread/sdk";
import { lucid, job } from "./shared"

const bulkUpdatePrice = async (
  items: { policyId: string; assetNameHex: string; price: number }[],
  affiliateDatum?: string,
  marketListing?: string,
  royalty?: Portion
) => {

  // *** Start by creating an empty transaction that will be put into the function on every iteration
  let tx = job.newTx()

  for (const item of items) {
    // *** This function enables you to update the price of multiple NFTs in a single transaction
    // *** instantBuyUpdateTx takes three required parameters: tx, item (policyId + assetNameHex) and new price
    // *** instantBuyUpdateTx takes three optional parameters: listing, affiliate and royalty
    tx = await job.instantBuyUpdateTx(
      tx,
      item.policyId + item.assetNameHex,
      BigInt(item.price),
      /*
      // *** listing parameter is the treasury datum of the listing marketplace
      marketListing,
      // *** affiliate parameter takes a string of the affiliate treasury datum
      affiliateDatum,
      // *** royalty paramater takes a Portion object with treasury datum and percentage
      royalty
      */
    );
  }

  const txHash = await job.finishTx(await tx.lucid())
  return txHash
}

// *** Replace with actual data here
console.log(await bulkUpdatePrice(
  [
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "4d696b73615468654861697279",
      price: 6000000,
    },
    {
      policyId: "75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737",
      assetNameHex: "4d696b73615468654861697279",
      price: 7000000,
    },
  ],
  "affiliateDatum",
  "marketplaceAffiliateDatum",
  {

    percent: 0.15,
    treasury: "royaltyTreasury",
  }
))
