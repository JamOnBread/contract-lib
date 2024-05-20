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
import { job, policyId, assetName } from "./shared";

const makeOffer = async (
  policyId: string,
  assetName: string,
  priceInLovelace: number,
  affiliateDatum?: string,
  marketListing?: string,
  royaltyAddress?: string,
  royaltyPercentage?: number
) => {


  const royalties: Portion | undefined =
    royaltyAddress && royaltyPercentage
      ? {
        treasury: job.addressToDatum(royaltyAddress),
        percent: royaltyPercentage,
      }
      : undefined;

  // *** offerList function has two required parameters: unit object (policyId + assetName) and price
  // *** offerList function has three optional parameters: listing, affiliate and royalty
  const txHash = await job.offerList(
    // *** When only policyId is filled in the unit object and assetName is undefined, that means the offer is the collection offer
    // *** When the assetName is specified, the offer is for a single asset
    { policyId: policyId, assetName: assetName },
    BigInt(priceInLovelace),
    // *** listing parameter is the treasury datum of the listing marketplace
    marketListing,
    // *** affiliate parameter takes a string of the affiliate treasury datum
    affiliateDatum,
    // *** royalty paramater takes a Portion object with treasury datum and percentage
    royalties
  );

  return txHash;
};

// *** Replace with actual data here
const txHash = await makeOffer(
  policyId,
  assetName,
  80000000
)
await job.awaitTx(txHash)
console.log(txHash)
