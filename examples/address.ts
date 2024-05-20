import { lucid } from "./shared"

const address = "addr_test1qp959nkyjdqyq7jkeqaszkp0tw3rlan70skq65apyk0ly2apajtu83l8regx8s8pa7t84za4gxgf4w5lr56x27e30seswyw3fk"
const payment = lucid.utils.paymentCredentialOf(address)
const stake = lucid.utils.stakeCredentialOf(address)

console.log(address)
console.log(payment.hash, stake.hash)