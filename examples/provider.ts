import { provider } from "./shared"


//console.log(await provider.getProtocolParameters())
//console.log(await provider.getUtxos("addr_test1xr9nldffmdvgvsmu9hz99hanpcyzdnmtaltdl4w3w8dmdyn47urvnnaht8q9cal8mvf6ghr8q6sv42lw2ahregg6fx7ssa30xs"))
//console.log(await provider.getUtxosWithUnit("addr_test1wzn5ee2qaqvly3hx7e0nk3vhm240n5muq3plhjcnvx9ppjgf62u6a", "1116903479e7320b8e4592207aaebf627898267fcd80e2d9646cbf07" + "4e6f646546656564"))
//console.log(await provider.getUtxoByUnit("75dcafb17dc8c6e77636f022b932618b5ed2a6cda9a1fe4ddd414737" + "4d696b73615468654861697279"))
//console.log(await provider.getDelegation("stake_test1urku22qg6k9yyr8zmu7633c33jzcc74pxma8k2cm4glgrmgrmu5lc"))
/*
console.log(await provider.getUtxosByOutRef([
    {txHash: "db966547ee05da0fbc31f1543cc7f552f1e8499ce721d73de146a02cf0a4ae53", outputIndex: 0},
    {txHash: "db966547ee05da0fbc31f1543cc7f552f1e8499ce721d73de146a02cf0a4ae53", outputIndex: 1},
    {txHash: "db966547ee05da0fbc31f1543cc7f552f1e8499ce721d73de146a02cf0a4ae53", outputIndex: 2}
]))
*/
//console.log(await provider.getDatum("43827725592108b10de662cb7bfabc3540952e134e163f7604b9d776221084cd"))
console.log(await provider.getScript("a2ffaa464e61a2d1d93d898d156bbb3ae033a202d77b768f97a119c3"))
//console.log(await provider.getContract({ txHash: "db966547ee05da0fbc31f1543cc7f552f1e8499ce721d73de146a02cf0a4ae53", outputIndex: 0 }))
//console.log(await provider.awaitTx("db966547ee05da0fbc31f1543cc7f552f1e8499ce721d73de146a02cf0a4ae53"))