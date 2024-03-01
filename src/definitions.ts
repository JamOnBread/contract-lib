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

import type { OutRef } from "lucid-cardano"


export type Portion = {
    percent: number,
    treasury: string,
}

export type WantedAsset = {
    policyId: string,
    assetName: string | undefined
}

export type InstantBuyDatumV1 = {
    beneficier: string,
    listingMarketDatum: string,
    listingAffiliateDatum: string,
    amount: bigint,
    royalty: Portion | undefined
}

export type OfferDatumV1 = {
    beneficier: string,
    listingMarketDatum: string,
    listingAffiliateDatum: string,
    amount: bigint,
    wantedAsset: WantedAsset,
    royalty: Portion | undefined
}

export type SignParams = {
    address: string,
    secret: string,
    signature: string,
    key: string
}

export type ReservationResponse = {
    all: boolean,
    blocked: boolean,
    expiration: number,
    utxos: Map<string, OutRef>
}

export type UtxosResponse = {
    utxos: OutRef[]
}

export type WithdrawResponse = {
    utxos: OutRef[],
    expiration: number
}

export enum Lock {
    Locked,
    Partial,
    Blocked,
    Error
}
