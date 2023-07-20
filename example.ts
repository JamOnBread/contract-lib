

import { JoB } from './src/job'
import type { Context } from "./src/types"
import { Lucid, Blockfrost, Data } from 'lucid-cardano'

const privKey = "ed25519_sk1z5zd4ap8nyyvlh2uz5rt08xh76yjhs0v7yv58vh00z399m3vrppqfhxv0n"
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preprod.blockfrost.io/api/v0", 
    "preprodVm9mYgzOYXlfFrFYfgJ2Glz7AlnMjvV9"
  ),
  "Preprod",
);
lucid.selectWalletFromPrivateKey(privKey)
const ctx = {
    hashes: {
      instantbuyPolicy: "f6043416180a15721ff8f8daf830695cc7d98868725a6c5ca9743bc2",
      instantbuyScript: "5538eab65a2b3a38f3e159d0ee14aa68510e5a06a422385abd6f6001",
      treasuryPolicy: "b975a67e713d337f0b2cea1a5079f13a411730e2b8c20b9b5561292a",
      treasuryScript: "567aa15400d9d693fdc00ab731f5f4763ade20f145bf1d3cf2d6d05e"
    },
    utxos: {
      instantbuyScript: {
        txHash: "1473d3b40edd2578d7bad8f081e3d4f1ff9cdde0419b14193355e8f4e9afcc74",
        outputIndex: 0
      },
      instnantbuyPolicy: {
        txHash: "594fff82e943159196419830a5106e8015f11272d819b7aaf301888da263557a",
        outputIndex: 0
      },
      protocolParams: {
        txHash: "a361c64e9be20fa8ef1b1e04f086631dac04e31ef3f5c19d76a155f02553c07a",
        outputIndex: 0
      },
      treasuryPolicy: {
        txHash: "054b0aa27fb650a61e4c50c94407d123044f27eb5a583dc5650e522e9259ca60",
        outputIndex: 0
      },
      treasuryScript: {
        txHash: "4ef2212809b9fe4e00566f126add88bd80da73bfc68d8e70bbd7ba261d56f06f",
        outputIndex: 0
      }
    },
    jobTokenCount: 10,
    jobToken: "b1ecd813e9084e3592d0986c41b63197fe2eb8e8994c4269933f8363",
    jobTokenName: "709acbc8be65c4729134a42662b9c04f147f0d988fd852571cfd1d0b",
    stakes: [
      "fd865714e87374670bd34b8536536c9971fa568d2a0ac923d330d70b",
      "65333c4f945b59975ac9e9a96c5085d7ed1eb76209ea7da63419d099",
      "58da875b0cc9a2edc10be2dd1c589d23a3a315860af272413ccf0563",
      "828ae02c9e58817529b8b7fd1b239f94d4951e5b7740ee412190e91c",
      "3012555d5e293af00cfd46cfe8a6e92e3b2879071a0f6ce827ad2870",
      "770434c23691fc14f4e052f8c50d7a1d9bf4efa3bbbd17b4012b6d97",
      "d3e4fadb384a43df4ccf0b54152e0d5030a8b772ed200259772a7d7b",
      "0d8ddb5e3927bec77e4218cef77e8fb0a6d67fe02c6760271c92868b",
      "37987ebe567a5b61067c20ae01d6125e5c8bf99b86f0782e6dc7f571",
      "aa4cea434cac0abbe1a4b5168f201d4de6e71bf0e17bd90a128ebd9a"
    ]
  } as Context

export const job = new JoB(ctx)

//console.log(job.instantbuyScriptAddress)

//const treasuries = await job.getTreasuries(lucid)

//console.log(await job.getInstantbuys(lucid))

//console.log(await job.treasuryCreateAddress(lucid))

//console.log(await job.treasuryWithdraw(lucid, "d8799fd8799fd8799f581cbd72b8c93f8d9b995c3381936fbc5166ba44bae685c5664fb22c401cffd87a80ffff", "Address"))

/*
console.log(await job.instantbuyCreate(
  lucid, 
  "75b6380638b658707c176d2a572168fb93d4928467aca10a97c846ee" + "4a6f4250726f746f636f6c566572696669636174696f6e",
  10_000_000n,
  Data.to(job.treasuryDatum)
  )
)
*/



/*
console.log(await job.instantBuyCancel(lucid, {
  txHash: "",
  outputIndex: 0
}))
*/


console.log(await job.instantBuyProceed(lucid, {
  txHash: "30488fb821248e73dc5e4ac51b7a81dc0a31a85f5fd6c6204ec9581285604ef4",
  outputIndex: 0
}, Data.to(job.treasuryDatum)))
