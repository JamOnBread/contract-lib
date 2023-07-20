import {C, Constr } from "lucid-cardano"

export function encodeAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
  ) : Constr<any> {
    const paymentCredential = new Constr(0, [paymentPubKeyHex]);
  
    const stakingCredential = stakingPubKeyHex
      ? new Constr(0, [new Constr(0, [new Constr(0, [stakingPubKeyHex])])])
      : new Constr(1, []);
  
    return new Constr(0, [paymentCredential, stakingCredential]);
  }
  
export function encodeTreasuryDatumAddress(
    paymentPubKeyHex: string,
    stakingPubKeyHex?: string
  ): Constr<any> {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex);
    return new Constr(0, [address]);
  }

export function encodeTreasuryDatumTokens(
    currencySymbol: string,
    minTokens: BigInt
  ) : Constr<any> {
    return new Constr(1, [new Constr(0, [currencySymbol, minTokens])]);
  };
  
export function encodeRoyalty(royaltyWM?: C.PlutusData, percent?: number) : Constr<any> {
    return royaltyWM && percent
      ? new Constr(0, [new Constr(0, [BigInt(percent * 10_000), royaltyWM])])
      : new Constr(1, []);
  };