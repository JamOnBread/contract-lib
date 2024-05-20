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
import { OutRef } from "lucid-cardano";
import { job, unit, outRef, marketTreasury, affiliateTreasury } from "./shared";

const acceptOffer = async (
  // *** unit is a policyId + assetNameHex string
  unit: string,
  // *** listingTxHash is the hash of the listing you want to accept the offer for
  outRef: OutRef,
  // *** affiliate treasury of your own marketplace
  marketplaceTreasury: string,
  // *** force is a boolean that forces the transaction to go through even if there are no available UTXOs in the wallet
  // *** force is set to false by default, if set to true, the price of the TX will be higher based on the number of UTXOs needed to cover the transaction
  force?: boolean,
  // *** there may be multiple treasuries that will receive a percentage of the total price
  // *** in this example, there are two treasuries: affiliate and sub-affiliate
  affilTreasury?: string,
  subAffilTreasury?: string
) => {
  // *** portions is an array of objects with two keys: percent and treasury
  // *** percent is the percentage of the total price that will go to the treasury
  // *** treasury is the treasury datum of the treasury that will receive the percentage of the total price
  // *** there may be as many objects in the array as needed, but the sum of all percentages must be equal to 1 (100%)
  let portions = [] as Portion[];

  // *** Example if no treasuries (affiliate or sub-affiliate) are provided
  if (!affilTreasury && !subAffilTreasury) {
    portions = [{ percent: 1, treasury: marketplaceTreasury }];

    // *** Example if only affiliate treasury is provided
  } else if (affilTreasury && !subAffilTreasury) {
    portions = [
      { percent: 0.6, treasury: marketplaceTreasury },
      { percent: 0.4, treasury: affilTreasury },
    ];

    // *** Example if both affiliate and sub-affiliate treasuries are provided
  } else if (affilTreasury && subAffilTreasury) {
    portions = [
      { percent: 0.5, treasury: marketplaceTreasury },
      { percent: 0.4, treasury: affilTreasury },
      {
        percent: 0.1,
        treasury: subAffilTreasury,
      },
    ];
  }

  // *** offerProceed function has one required parameter (utxo) and two optional parameters (force and portions array)
  const txHash = await job.offerProceed(
    outRef,
    unit,
    force,
    // *** portions is an array of objects with two keys: percent and treasury
    // *** percent is the percentage of the total price that will go to the treasury
    // *** treasury is the treasury datum of the treasury that will receive the percentage of the total price
    ...portions
  );

  return txHash;
};

// *** Replace with actual data here
const txHash = await acceptOffer(
  unit,
  outRef,
  marketTreasury,
  false,
  affiliateTreasury
)
await job.awaitTx(txHash)
console.log(txHash)
