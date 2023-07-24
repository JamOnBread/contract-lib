import { Constr } from "lucid-cardano";
export function encodeAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const paymentCredential = new Constr(0, [paymentPubKeyHex]);
    const stakingCredential = stakingPubKeyHex
        ? new Constr(0, [new Constr(0, [new Constr(0, [stakingPubKeyHex])])])
        : new Constr(1, []);
    return new Constr(0, [paymentCredential, stakingCredential]);
}
export function encodeTreasuryDatumAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex);
    return new Constr(0, [address]);
}
export function encodeTreasuryDatumTokens(currencySymbol, minTokens) {
    return new Constr(1, [new Constr(0, [currencySymbol, minTokens])]);
}
;
export function encodeRoyalty(royaltyWM, percent) {
    return royaltyWM && percent
        ? new Constr(0, [new Constr(0, [BigInt(percent * 10000), royaltyWM])])
        : new Constr(1, []);
}
;
//# sourceMappingURL=utils.js.map