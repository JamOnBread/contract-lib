import { Lucid, Blockfrost, Data } from "lucid-cardano"
import {JamOnBreadAdminV1, WantedAsset, Portion, encodeTreasuryDatumAddress} from "./dist/index.js"

const privKey = "ed25519_sk1z5zd4ap8nyyvlh2uz5rt08xh76yjhs0v7yv58vh00z399m3vrppqfhxv0n" // Treaury
//const privKey = "ed25519_sk1vmcvrrew9ppggulj08e9lg5w333t58qy2pmylprz4lg2ka0887kqz5zurk" // Test
const lucid = await Lucid.new(
    new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", "preprodVm9mYgzOYXlfFrFYfgJ2Glz7AlnMjvV9"),
    "Preprod",
)
lucid.selectWalletFromPrivateKey(privKey)


const job = new JamOnBreadAdminV1(lucid, "74ce41370dd9103615c8399c51f47ecee980467ecbfcfbec5b59d09a", "556e69717565")
console.log("Instant buy", job.getInstantBuyAddress(0))
console.log("Offer", job.getOfferAddress(1))
/*
const asset = {
    policyId: "b1ecd813e9084e3592d0986c41b63197fe2eb8e8994c4269933f8363",
    assetName: "4a6f42566572696669636174696f6e"
} as WantedAsset
const unit = asset.policyId + asset.assetName

// console.log(await job.getTreasuries())
// console.log(await job.squashNft())
console.log(await lucid.wallet.address())

const portions = [
    {
        percent: 0.2,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vz6r5aetvn6m6y8lax7zlx9dl7hnfm53q4njwzdcyzqmzdct4jjws").hash
        ))
    },
    {
        percent: 0.2,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vz695rlavrxv8wm2r7ur6skp5f3gtkx3xsqk20gpvest92qd42p39").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr0yzzjnsnxpkf48n56s5jp06df2tx4dylch7j2zwm0tnrcwrmc4c").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqrmaa655rtcxu5lg9nd7tph6wxzq5su646nmweuh798ayqa4z4hc").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vplh9cjn8vhmzn7qs8ynv7aea3t567a9w4lagetrf896q3q0xamca").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr6v0wmlzs8xashkqdpm9k47l0q9aek0mucef273ky2xuhcfwqj92").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqxzql8rxfxefdzjz9t6rdnly0lrffcngk9wy29c6l6j7sss5m2p6").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vr49pv7cpft4fekwg7atl4lv7fc839u72fkc9v39e0x3svcmytec9").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vqcg5dsaz9kq8n7nj8kpkr8yvpst3me4qzpzpcwkh8sexhc7n5pm7").hash
        ))
    },
    {
        percent: 0.1,
        treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vrhvvu6kn96f05ucldwlmdg46djdrerrat4qqc28xaj44kcz8j4sd").hash
        ))
    }]


console.log(
    await job.instantbuyList(
        unit,
        10_000_000n,
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vp54hwj38ykwyvek6vdkug6flwrdtwuazqlwuqngzw5deks388fd7").hash
        )),
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vry4ww84sje8lmvw35glqgkdt6ahzdz04x8yqkfmpt5t3xcrve047").hash
        )),
        {percent: 0.1, treasury: Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vrelgt8camtmzktcykamyh8rgpq5sutueeawpzwykwpdujq05epfh").hash
        ))} as Portion
    )
)

/*
console.log(await job.instantBuyCancel({
    txHash: "db0f647a8e3685da088a0003b249fc658e14cde6a8a1ab39cec06935317d9c90",
    outputIndex: 0
}))
*/

/*
console.log(await job.instantBuyProceed(
    {
        txHash: "0db4ecea71e76926635b84870d363b557599abf73e69d1d82c9045f5cc8ea760",
        outputIndex: 0
    },
    false,
    ...portions.slice(0, 5)
))
*/

/*
console.log(
    await job.offerList(
        asset,
        10_000_000n,
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vp54hwj38ykwyvek6vdkug6flwrdtwuazqlwuqngzw5deks388fd7").hash
        )),
        Data.to(encodeTreasuryDatumAddress(
            lucid.utils.paymentCredentialOf("addr_test1vry4ww84sje8lmvw35glqgkdt6ahzdz04x8yqkfmpt5t3xcrve047").hash
        )),
        {
            percent: 0.1, treasury: Data.to(encodeTreasuryDatumAddress(
                lucid.utils.paymentCredentialOf("addr_test1vrelgt8camtmzktcykamyh8rgpq5sutueeawpzwykwpdujq05epfh").hash
            ))
        } as Portion
    )
)
*/

/*
console.log(await job.offerCancel({
    txHash: "903ae426984c49586be01132f8c5ed0e7db3363f74c4e1820c32d396a8c621ea",
    outputIndex: 0
}))
*/

/*
console.log(await job.offerProceed(
    {
        txHash: "ef0aa11cbfa22359623fbdaee32464513c82313dcd3b57130a92821ed0d060c7",
        outputIndex: 0
    },
    unit,
    false,
    ...portions.slice(0, 5)
))
*/

// console.log(job.getTreasuryAddress(0))*/