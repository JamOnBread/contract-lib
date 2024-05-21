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

import { Contract, type ContractType } from "./contract"
import { Data, Constr, paymentCredentialOf } from "lucid-cardano"

export class Context {

    readonly jobApiUrl: string
    readonly jobTokenPolicy: string
    readonly jobTokenName: string
    readonly numberOfToken: number
    readonly minimumJobFee: bigint = 100_000n
    readonly minimumFee = 20_000n

    readonly contracts: Contract[]

    constructor(
        jobApiUrl: string,
        jobTokenPolicy: string,
        jobTokenName: string,
        numberOfToken: number,
        contracts: Contract[]) {
        this.jobApiUrl = jobApiUrl

        this.jobTokenPolicy = jobTokenPolicy
        this.jobTokenName = jobTokenName
        this.numberOfToken = numberOfToken

        this.contracts = contracts
    }

    public getContractByHash(hash: string): Contract {
        const contract = this.contracts.find(contract => (hash == contract.hash))
        if (contract) {
            return contract
        }
        throw new Error("No contract found")
    }
    public getContractByAddress(address: string): Contract {

        const paymentCred = paymentCredentialOf(address)
        if (paymentCred) {
            return this.getContractByHash(paymentCred.hash)!
        }

        throw new Error("No contract found")
    }

    public getContract(type: ContractType): Contract {
        return this.contracts.find(contract => (contract.active && contract.type == type))!
    }
}