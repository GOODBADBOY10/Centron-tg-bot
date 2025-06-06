// import { HopApi, HopApiOptions } from "@hop.ag/sdk";
import { HopApi } from "@hop.ag/sdk";
// import { setSuiClient, getQuote, buildTx } from "@7kprotocol/sdk-ts";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
// import { signAndExecuteTx } from "./client";
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import dotenv from 'dotenv';

dotenv.config();
const rpc_url = getFullnodeUrl("mainnet");
const suiClient = new SuiClient({ url: rpc_url });



// const network = "mainnet";
// const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
// setSuiClient(suiClient);


const fee_wallet = process.env.FEE_WALLET || "0x3161ccd892980b9b477ac4c78286e0ed33b43a107e9524b5491f1a5b62b59c10"
const fee_bps = process.env.FEE_BPS || "100"

const hop_api_options = {
    api_key: process.env.HOP_API_KEY || "",

    // 1bps = 0.01%. 10_000bps = 100%.
    fee_bps: Number(fee_bps),
    fee_wallet: fee_wallet,

    // option to charge fees in sui when possible
    // instead of only the output token
    charge_fees_in_sui: true,
};

const sdk = new HopApi(rpc_url, hop_api_options);

// export const buyTokenSuiHop = async (token, address, amount, phrase) => {
//     // console.log(token);
//     const quote = await sdk.fetchQuote({
//         token_in: "0x2::sui::SUI",
//         token_out: token,
//         amount_in: BigInt(amount * 10 ** 9),
//     });

//     const tx = await sdk.fetchTx({
//         trade: quote.trade,
//         sui_address: address,

//         gas_budget: 0.03e9, // optional default is 0.03 SUI
//         max_slippage_bps: 100, // optional default is 1%

//         return_output_coin_argument: false, // toggle to use the output coin in a ptb
//     });

//     const keypair = Ed25519Keypair.deriveKeypair(phrase)
//     const { objectChanges, balanceChanges } = await suiClient.signAndExecuteTransaction({
//         transaction: tx.transaction,
//         signer: keypair,
//         options: {
//             showBalanceChanges: true,
//             showEvents: true,
//             showInput: false,
//             showEffects: true,
//             showObjectChanges: true,
//             showRawInput: false,
//         }
//     });
//     console.log(objectChanges);
//     if (objectChanges) {
//         return true
//     } else {
//         return false
//     }
// }


export const buyTokenSuiHop = async (token, address, amount, phrase) => {
    console.log("🔧 [Mock] Starting mock buy process...");

    // Mock a quote response
    const quote = {
        trade: {
            mockTradeId: "mock-trade-123",
            token_in: "0x2::sui::SUI",
            token_out: token,
            amount_in: BigInt(amount * 10 ** 9),
            amount_out: BigInt(amount * 9.5 * 10 ** 9), // simulate slippage
        },
    };

    // Mock a transaction response
    const tx = {
        transaction: {
            mockTransactionId: "mock-tx-456",
            trade: quote.trade,
        },
    };

    // Simulate signing and executing the transaction
    // console.log(`🔏 [Mock] Deriving keypair from phrase: ${phrase.slice(0, 5)}...`);
    console.log(`🚀 [Mock] Executing transaction for address: ${address}`);
    console.log(`💰 [Mock] Buying ${amount} SUI worth of token: ${token}`);

    const objectChanges = [
        {
            type: "created",
            objectId: "0xMOCKEDTOKEN123",
            objectType: token,
            owner: address,
        },
    ];

    const balanceChanges = [
        {
            coinType: token,
            amount: BigInt(amount * 9.5 * 10 ** 9),
        },
    ];

    console.log("📦 [Mock] Object Changes:", objectChanges);
    console.log("💹 [Mock] Balance Changes:", balanceChanges);

    return true; // simulate successful purchase
};


const sellTokenSuiHop = async (token, address, amount, decimals, phrase) => {
    console.log(Math.floor(amount * 10 ** decimals));
    const quote = await sdk.fetchQuote({
        token_in: token,
        token_out: "0x2::sui::SUI",
        amount_in: BigInt(Math.floor(amount * 10 ** decimals)),
    });
    console.log(quote)
    const tx = await sdk.fetchTx({
        trade: quote.trade,
        sui_address: address,

        gas_budget: 0.03e9, // optional default is 0.03 SUI
        max_slippage_bps: 100, // optional default is 1%

        return_output_coin_argument: false, // toggle to use the output coin in a ptb
    });

    const keypair = Ed25519Keypair.deriveKeypair(phrase)
    const { objectChanges, balanceChanges } = await suiClient.signAndExecuteTransaction({
        transaction: tx.transaction,
        signer: keypair,
        options: {
            showBalanceChanges: true,
            showEvents: true,
            showInput: false,
            showEffects: true,
            showObjectChanges: true,
            showRawInput: false,
        }
    });
    console.log(objectChanges);
    if (objectChanges) {
        return true
    } else {
        return false
    }
}

const buyTokenSui7k = async (token, address, amount, phrase) => {
    // console.log(token);
    const quoteResponse = await getQuote({
        tokenIn: "0x2::sui::SUI",
        tokenOut: token,
        amountIn: Math.floor(amount * 10 ** 9).toString(),
    });

    // console.log(quoteResponse);

    const result = await buildTx({
        quoteResponse,
        accountAddress: address,
        slippage: 0.01, // 1%
        commission: {
            partner: fee_wallet,
            commissionBps: Number(fee_bps), // 0 means no fee, 1bps = 0.01%, for example, 20bps = 0.2%
        },
    });

    const { tx, coinOut } = result || {};

    const keypair = Ed25519Keypair.deriveKeypair(phrase)
    const { objectChanges, balanceChanges } = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
            showBalanceChanges: true,
            showEvents: true,
            showInput: false,
            showEffects: true,
            showObjectChanges: true,
            showRawInput: false,
        }
    });
    console.log(objectChanges);
    if (objectChanges) {
        return true
    } else {
        return false
    }
}

const sellTokenSui7k = async (token, address, amount, decimals, phrase) => {
    // console.log(token, address, amount, decimals);
    console.log(Math.floor(amount * 10 ** decimals).toString())
    const quoteResponse = await getQuote({
        tokenIn: token,
        tokenOut: "0x2::sui::SUI",
        amountIn: (amount * 10 ** decimals).toString(),
    });

    const result = await buildTx({
        quoteResponse,
        accountAddress: address,
        slippage: 0.01, // 1%
        commission: {
            partner: fee_wallet,
            commissionBps: Number(fee_bps), // 0 means no fee, 1bps = 0.01%, for example, 20bps = 0.2%
        },
    });

    const { tx, coinOut } = result || {};

    const keypair = Ed25519Keypair.deriveKeypair(phrase)
    const { objectChanges, balanceChanges } = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
            showBalanceChanges: true,
            showEvents: true,
            showInput: false,
            showEffects: true,
            showObjectChanges: true,
            showRawInput: false,
        }
    });
    console.log(objectChanges);
    if (objectChanges) {
        return true
    } else {
        return false
    }
}

export const buyTokenSui = async (userId, token, address, amount, phrase) => {
    if (phrase) {  // Checks if phrase is truthy, covers both null and undefined
        try {
            const condition = await buyTokenSuiHop(token, address, amount, phrase);
            return condition;
        } catch (error) {
            console.error("Error in buyTokenSuiHop:", error);
            try {
                const condition = await buyTokenSui7k(token, address, amount, phrase);
                return condition;
            } catch (error) {
                console.error("Error in buyTokenSui7k:", error);
                return false;
            }
        }
    } else {
        console.log("Phrase not provided");
        return false;
    }
};

export const sellTokenSui = async (userId, token, address, amount, decimals, phrase) => {
    if (phrase) {  // Checks if phrase is truthy, covers both null and undefined
        try {
            const condition = await sellTokenSuiHop(token, address, amount, decimals, phrase);
            return condition;
        } catch (error) {
            console.error("Error in sellTokenSuiHop:", error);
            try {
                const condition = await sellTokenSui7k(token, address, amount, decimals, phrase);
                return condition;
            } catch (error) {
                console.error("Error in sellTokenSui7k:", error);
                return false;
            }
        }
    } else {
        console.log("Phrase not provided");
        return false;
    }
};
// buyTokenSui("0x36ea3e465039b675ebc4907008ccc9e30e6dce0a1cd2bde671d30ac172ca81e7::suipark::SUIPARK", 
// "0x48dfdd7c1acb1b4919e1b4248206af584bef882f126f1733521ac41eb13fb77b", 100)