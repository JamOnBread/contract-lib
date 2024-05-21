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

import { Portion } from "@jamonbread/sdk";
import { job, unit } from "./shared"

const listAsset = async (
  unit: string,
  priceInLovelace: number,
  affiliateDatum?: string,
  marketListing?: string,
  royalty?: Portion,
) => {

  // *** instantBuyList function has two required parameters: unit string (policyId + assetNameHex) and price
  // *** instantBuyList function has three optional parameters: listing, affiliate and royalty
  const txHash = await job.instantBuyList(
    // *** unit is a policyId + assetNameHex string
    unit,
    BigInt(priceInLovelace),
    // *** listing parameter is the treasury datum of the listing marketplace
    marketListing,
    // *** affiliate parameter takes a string of the affiliate treasury datum
    affiliateDatum,
    // *** royalty paramater takes a Portion object with treasury datum and percentage
    royalty
  );

  return txHash;
};

// *** Replace with actual data here
const hash = await listAsset(
  unit,
  10_000_000
)
await job.awaitTx(hash)
console.log(hash)
