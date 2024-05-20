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

import { lucid } from "./shared"

const address = "addr_test1qp959nkyjdqyq7jkeqaszkp0tw3rlan70skq65apyk0ly2apajtu83l8regx8s8pa7t84za4gxgf4w5lr56x27e30seswyw3fk"
const payment = lucid.utils.paymentCredentialOf(address)
const stake = lucid.utils.stakeCredentialOf(address)

console.log(address)
console.log(payment.hash, stake.hash)
