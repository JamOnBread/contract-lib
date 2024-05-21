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


export function getContextMainnet(): Context {
    const parametres_1 = {
        minimumFee: 100000,
        minimumJobFee: 200000,
        jobTreasury: "d87a9fd8799f581c5d87ebacd1b26282675a61a1cde3e8c64282677739abb58124138e9c05ffff",
        minUtxoValue: 0,
        addToTreasury: 0,
        addToPrice: 0
    }

    const stakes_1 = [
        '1e3ef6f3295e88c97a5871b06a5d28ccb588ab150aa7cb86b8db9194',
        '3a3fd4ba4ccfeab2baf6138b8f058fc755ea60d6e45955694b1080e7',
        '5671059290d40700a0e9fc57062d233c7fee6f34a6deeef6146a62d0',
        'fe71e984dff3b560194f7996797ed99004d8cadc35f2a9e6465a3da8',
        'a0cc2a5387f159b3abd8039280234735379c396b44c97d12f1953e33',
        'ec6abc758d5afa264584ec41c18c806c72f23ed63ce7242e9c00a876',
        '1602fdafa14ab4a5b9ce11f2764e67daa0051afa064cc9682bc4803a',
        'b7270c51bfbd729e9ad455fba0895d81c6be9e694b7e9a6ab86363b1',
        'de83e4278c5667080451998e7d5ac2de4e607591b021eec7752cd4d7',
        'cedc368fa1e902bc41cfdac0031f7763cad0e35cf614240ee2a5807a'
    ]

    const treasury_1 = new JobContractTreasury(
        ContractType.JobTreasury,
        true,
        '2ebc898f717d90206abe59b91c5e54fbae8744e16d4abe5a521f8588',
        parametres_1,
        stakes_1
    )

    return new Context(
        "https://api-mainnet-prod.jamonbread.tech/api/",
        "5d87ebacd1b26282675a61a1cde3e8c64282677739abb58124138e9c",
        "4a6f42",
        5,
        [
            // Trading
            new JobContractOffer(
                ContractType.JobOffer,
                true,
                'f93ccc5c684e2d936d6a5b21fb54fa14de86c62adccf916f31d0bf95',
                parametres_1,
                stakes_1,
                treasury_1
            ),
            new JobContractInstantBuy(
                ContractType.JobInstantBuy,
                true,
                'ceb5d9e9b6a10ecea85712a32cd1ecc21245b24af76416855f130c68',
                parametres_1,
                stakes_1,
                treasury_1
            ),
            treasury_1,

            // Stake
            new JobContract(
                ContractType.JobStake,
                true,
                '1e3ef6f3295e88c97a5871b06a5d28ccb588ab150aa7cb86b8db9194',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '3a3fd4ba4ccfeab2baf6138b8f058fc755ea60d6e45955694b1080e7',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '5671059290d40700a0e9fc57062d233c7fee6f34a6deeef6146a62d0',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'fe71e984dff3b560194f7996797ed99004d8cadc35f2a9e6465a3da8',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'a0cc2a5387f159b3abd8039280234735379c396b44c97d12f1953e33',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'ec6abc758d5afa264584ec41c18c806c72f23ed63ce7242e9c00a876',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                '1602fdafa14ab4a5b9ce11f2764e67daa0051afa064cc9682bc4803a',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'b7270c51bfbd729e9ad455fba0895d81c6be9e694b7e9a6ab86363b1',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'de83e4278c5667080451998e7d5ac2de4e607591b021eec7752cd4d7',
                parametres_1
            ),
            new JobContract(
                ContractType.JobStake,
                true,
                'cedc368fa1e902bc41cfdac0031f7763cad0e35cf614240ee2a5807a',
                parametres_1
            ),
            // Lock
            new JobContract(
                ContractType.JobLock,
                true,
                '0cd44c1b26fd2ade79fa46092c90ef5b5897beec85c49c4bbf2eee04',
                parametres_1
            ),

            // JPG store
            // V2
            /*
            new JpgContract(
                false,
                'a55f409501bf65805bb0dc76f6f9ae90b61e19ed870bc00256813608',
                ''
            ),
            // V3
            new JpgContract(
                false,
                '9068a7a3f008803edac87af1619860f2cdcde40c26987325ace138ad',
                ''
            ),
            */
            // V4
            new JpgContract(
                true,
                'c727443d77df6cff95dca383994f4c3024d03ff56b02ecc22b0f3f65',
                'addr1xxzvcf02fs5e282qk3pmjkau2emtcsj5wrukxak3np90n2evjel5h55fgjcxgchp830r7h2l5msrlpt8262r3nvr8eksg6pw3p'
            ),
        ]
    )
}