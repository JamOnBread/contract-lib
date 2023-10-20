export declare const plutus: {
    preamble: {
        title: string;
        description: string;
        version: string;
        plutusVersion: string;
        license: string;
    };
    validators: ({
        title: string;
        redeemer: {
            title: string;
            schema: {
                $ref: string;
            };
        };
        parameters: {
            title: string;
            schema: {
                $ref: string;
            };
        }[];
        compiledCode: string;
        hash: string;
        datum?: undefined;
    } | {
        title: string;
        datum: {
            title: string;
            schema: {
                $ref: string;
            };
        };
        redeemer: {
            title: string;
            schema: {
                $ref: string;
            };
        };
        compiledCode: string;
        hash: string;
        parameters?: undefined;
    } | {
        title: string;
        datum: {
            title: string;
            schema: {
                $ref: string;
            };
        };
        redeemer: {
            title: string;
            schema: {
                $ref: string;
            };
        };
        parameters: {
            title: string;
            schema: {
                $ref: string;
            };
        }[];
        compiledCode: string;
        hash: string;
    })[];
    definitions: {
        ByteArray: {
            dataType: string;
        };
        Data: {
            title: string;
            description: string;
        };
        Int: {
            dataType: string;
        };
        "List$aiken/transaction/credential/Referenced$aiken/transaction/credential/Credential": {
            dataType: string;
            items: {
                $ref: string;
            };
        };
        "List$common/types/SellingMarketplaceFeePart": {
            dataType: string;
            items: {
                $ref: string;
            };
        };
        "Option$aiken/transaction/credential/Referenced$aiken/transaction/credential/Credential": {
            title: string;
            anyOf: {
                title: string;
                description: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "Option$common/types/Royalty": {
            title: string;
            anyOf: {
                title: string;
                description: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "Option$common/types/WithdrawalMethod": {
            title: string;
            anyOf: {
                title: string;
                description: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "aiken/transaction/OutputReference": {
            title: string;
            description: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "aiken/transaction/TransactionId": {
            title: string;
            description: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "aiken/transaction/credential/Address": {
            title: string;
            description: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "aiken/transaction/credential/Credential": {
            title: string;
            description: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "aiken/transaction/credential/Referenced$aiken/transaction/credential/Credential": {
            title: string;
            description: string;
            anyOf: ({
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            } | {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            })[];
        };
        "common/types/AssetClass": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/InstantBuyDatum": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/OfferDatum": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/Royalty": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/SellingMarketplaceFeePart": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/TokenValidation": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    title: string;
                    $ref: string;
                }[];
            }[];
        };
        "common/types/WantedAsset": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "common/types/WithdrawalMethod": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "instant_buy/InstantBuyRedeemer": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "offer/OfferRedeemer": {
            title: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: {
                    $ref: string;
                }[];
            }[];
        };
        "treasury/TreasuryRedeemer": {
            title: string;
            description: string;
            anyOf: {
                title: string;
                dataType: string;
                index: number;
                fields: never[];
            }[];
        };
    };
};
