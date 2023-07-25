"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeRoyalty = exports.encodeTreasuryDatumTokens = exports.encodeTreasuryDatumAddress = exports.encodeAddress = void 0;
const lucid_cardano_1 = require("lucid-cardano");
function encodeAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const paymentCredential = new lucid_cardano_1.Constr(0, [paymentPubKeyHex]);
    const stakingCredential = stakingPubKeyHex
        ? new lucid_cardano_1.Constr(0, [new lucid_cardano_1.Constr(0, [new lucid_cardano_1.Constr(0, [stakingPubKeyHex])])])
        : new lucid_cardano_1.Constr(1, []);
    return new lucid_cardano_1.Constr(0, [paymentCredential, stakingCredential]);
}
exports.encodeAddress = encodeAddress;
function encodeTreasuryDatumAddress(paymentPubKeyHex, stakingPubKeyHex) {
    const address = encodeAddress(paymentPubKeyHex, stakingPubKeyHex);
    return new lucid_cardano_1.Constr(0, [address]);
}
exports.encodeTreasuryDatumAddress = encodeTreasuryDatumAddress;
function encodeTreasuryDatumTokens(currencySymbol, minTokens) {
    return new lucid_cardano_1.Constr(1, [new lucid_cardano_1.Constr(0, [currencySymbol, minTokens])]);
}
exports.encodeTreasuryDatumTokens = encodeTreasuryDatumTokens;
;
function encodeRoyalty(royaltyWM, percent) {
    return royaltyWM && percent
        ? new lucid_cardano_1.Constr(0, [new lucid_cardano_1.Constr(0, [BigInt(percent * 10000), royaltyWM])])
        : new lucid_cardano_1.Constr(1, []);
}
exports.encodeRoyalty = encodeRoyalty;
;
//# sourceMappingURL=utils.js.map