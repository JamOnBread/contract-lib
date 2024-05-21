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


import { Context } from "./cardano/context"
import { ContractType } from "./cardano/contract"
import { JobContract, JobContractInstantBuy, JobContractOffer, JobContractTreasury } from "./cardano/job"
import { JpgContract } from "./cardano/jpg"

export function getContextPreprod(): Context {
    const parametres_1 = {
        minimumFee: 100000,
        minimumJobFee: 200000,
        jobTreasury: "d87a9fd8799f581c74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a0affff",
        minUtxoValue: 2000000,
        addToTreasury: 1,
        addToPrice: 1

    }

    const parametres_2 = {
        minimumFee: 10000,
        minimumJobFee: 200000,
        jobTreasury: "d87a9fd8799f581c74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a0affff",
        minUtxoValue: 0,
        addToTreasury: 0,
        addToPrice: 0
    }

    const stakes_1 = [
        '75f706c9cfb759c05c77e7db13a45c6706a0caabee576e3ca11a49bd',
        'd75e5d7b05677da8fcf1559604b78f1a04a4efe66824c3c120872531',
        'b5fdcab47fb13552725674580ac5913897ff98ab345d66e4659272f2',
        '989f9f230efa5a7d3df32768f80edf1a0f0c9228917dfe4ba58e8887',
        'ffaa991f62323723573304e589186b76782ac85f4c778e2fb9961703',
        '18a756323a406e37d1d0f0ea1b5d226cfc1c8ed724cd94b85d605dfb',
        '55d0b42920a5c68e822e092cc1fcc80cf8c0e2d1cb12ba4cf6a34190',
        '47ad55d8a36a2a587a21e03111cf9bf145d3d527fcf18cc837db257a',
        '27c2dbbe7194e6ffaaa6f0e1fbf5fa0ef4cb87ea32c007511c4cbd81',
        '94eebf3c0b56eca658e08d5acbdc57fa4f01b58d554e9e6d330f2b3f'
    ]
    const stakes_2 = [
        '2d0437ac8574af53e288c6f94b5f035ed8707cdfda578781f28898a7',
        '8e14a5944460cc0b197e180afa39d8b52d9d4dd5661781400da9e30b',
        '6b28b736446c4a6715d30184a75894f742303fac435bff1b4f6ddb17',
        '9cdfec494102f1e6056ee0e442539c28f5810db16a1131c60c7700bf',
        'd9b5bc90c4f94194a028230eeb572bb3da3ac014821863e36e9169df',
        '752ed9ec307438cd6a899d46c45bc383e8cb4ee3a69cb094b9f9f76b',
        '568c765023efa4a80370f2b3b053ef736c7570e306811ed4e11bdc03',
        'cfbcf92dc4aa5d8b613a7c691b16e8c4a31c0cbcd7fbd20b7f8e72e9',
        'e0cdd5a501f2e830b0efe41d859cc4ad7eb6cb2cdf71aec9d4e99b2f',
        '979c9e53d0241ad183fe777220c6a4483989a3406d278d5634336c53'
    ]
    const treasury_1 = new JobContractTreasury(
        ContractType.JobTreasury,
        false,
        'f7f2958d98792704d6cfce73c446f9b0a6f3c1b8db78c57a0c7aa202',
        parametres_1,
        stakes_1
    )
    const treasury_2 = new JobContractTreasury(
        ContractType.JobTreasury,
        true,
        'ef6e317b484f0d85b1401a222d8531398d356ced04c92f2bb0bcba3c',
        parametres_2,
        stakes_2
    )

    return new Context(
        "https://api-testnet-prod.jamonbread.tech/api/",

        "74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a",
        "556e69717565",
        1,
        [
            // Trading #1
            new JobContractOffer(
                ContractType.JobOffer,
                false,
                'ac12c9aadf9d65e96332cb35d3876b98fae94dffe90ff5c45df650ed',
                parametres_1,
                stakes_1,
                treasury_1
            ),
            new JobContractInstantBuy(
                ContractType.JobInstantBuy,
                false,
                'cc572503d64165b8ef1bb3d0c311b83924483cfff55ea74d0b3370b3',
                parametres_1,
                stakes_1,
                treasury_1
            ),
            treasury_1,

            // Trading #2
            new JobContractOffer(
                ContractType.JobOffer,
                true,
                'dceb58fd964029a1d4375de842a2384b6265decbd2db8f130182c078',
                parametres_2,
                stakes_2,
                treasury_2
            ),
            new JobContractInstantBuy(
                ContractType.JobInstantBuy,
                true,
                'a2ffaa464e61a2d1d93d898d156bbb3ae033a202d77b768f97a119c3',
                parametres_2,
                stakes_2,
                treasury_2

            ),
            treasury_2,

            // Stake 1
            new JobContract(
                ContractType.JobStake,
                false,
                '75f706c9cfb759c05c77e7db13a45c6706a0caabee576e3ca11a49bd',
                parametres_1,
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                'd75e5d7b05677da8fcf1559604b78f1a04a4efe66824c3c120872531',
                parametres_1,
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                'b5fdcab47fb13552725674580ac5913897ff98ab345d66e4659272f2',
                parametres_1,
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '989f9f230efa5a7d3df32768f80edf1a0f0c9228917dfe4ba58e8887',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                'ffaa991f62323723573304e589186b76782ac85f4c778e2fb9961703',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '18a756323a406e37d1d0f0ea1b5d226cfc1c8ed724cd94b85d605dfb',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '55d0b42920a5c68e822e092cc1fcc80cf8c0e2d1cb12ba4cf6a34190',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '47ad55d8a36a2a587a21e03111cf9bf145d3d527fcf18cc837db257a',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '27c2dbbe7194e6ffaaa6f0e1fbf5fa0ef4cb87ea32c007511c4cbd81',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '2d0437ac8574af53e288c6f94b5f035ed8707cdfda578781f28898a7',
                parametres_1
            ),

            // Lock
            new JobContract(
                ContractType.JobLock,
                true,
                'cb3fb529db5886437c2dc452dfb30e0826cf6befd6dfd5d171dbb692',
                parametres_1
            ),
            // Stake 2
            new JobContract(
                ContractType.JobStake,
                true,
                '2d0437ac8574af53e288c6f94b5f035ed8707cdfda578781f28898a7',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '8e14a5944460cc0b197e180afa39d8b52d9d4dd5661781400da9e30b',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '6b28b736446c4a6715d30184a75894f742303fac435bff1b4f6ddb17',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '9cdfec494102f1e6056ee0e442539c28f5810db16a1131c60c7700bf',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'd9b5bc90c4f94194a028230eeb572bb3da3ac014821863e36e9169df',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                false,
                '752ed9ec307438cd6a899d46c45bc383e8cb4ee3a69cb094b9f9f76b',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '568c765023efa4a80370f2b3b053ef736c7570e306811ed4e11bdc03',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'cfbcf92dc4aa5d8b613a7c691b16e8c4a31c0cbcd7fbd20b7f8e72e9',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'e0cdd5a501f2e830b0efe41d859cc4ad7eb6cb2cdf71aec9d4e99b2f',
                parametres_2
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '979c9e53d0241ad183fe777220c6a4483989a3406d278d5634336c53',
                parametres_2
            )
        ]
    )
}