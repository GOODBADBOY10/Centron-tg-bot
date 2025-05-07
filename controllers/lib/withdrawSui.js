import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
// import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { mnemonicToSeedSync } from 'bip39';
import { fromHex } from '@mysten/sui/utils';
import { fromBase64 } from '@mysten/bcs';
// import { mnemonicToSeedSync } from'@scure/bip39';
// import { HDKey } from '@scure/bip32';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import bs58 from 'bs58'

// import { bcs, fromHex, toHex } from '@mysten/bcs';
// import { fromB64 } from '@mysten/sui.js/utils';
import { shorten } from "../../utils/shorten.js";
import { fetchUser } from "./db.js";
import { userSteps } from "./userState.js";




export async function sendSui(walletPrivateKey, toAddressParam, amountParam) {
    try {
        console.log("SendSui function called with:", {
            hasPrivateKey: !!walletPrivateKey,
            toAddress: toAddressParam,
            amount: amountParam
        });

         // Validate inputs early
         if (!walletPrivateKey) {
            throw new Error("Missing wallet private key");
        }
        
        if (!toAddressParam) {
            throw new Error("Missing recipient address");
        }
        
        if (!amountParam || typeof amountParam !== 'number' || amountParam <= 0) {
            throw new Error(`Invalid amount: ${amountParam}`);
        }

        // let privateKey = walletPrivateKey;
        let privateKey = '0x456f178712fe771207b107ba499b42d45e997ec96b81db62f7134c0f619a7e45';
        const toAddress = toAddressParam;
        const amount = amountParam;
        // let privateKey, toAddress, amount;
        // Using the traditional parameter approach
        // privateKey = walletPrivateKey;
        // privateKey = '0xd1e441c79f431ba29c0591f4d97d993bfe0b80ff3e6721404ffd65eed86196d4';
        // toAddress = toAddressParam;
        // amount = parseFloat(amountParam);
        // amount = 3;

        if (typeof privateKey === 'object') {
            if (privateKey?.type === 'Buffer' && Array.isArray(privateKey?.data)) {
                privateKey = Buffer.from(privateKey.data).toString('hex');
            } else if (typeof privateKey.walletPrivateKey === 'string') {
                // If privateKey is nested inside an object
                privateKey = privateKey.walletPrivateKey;
            } else {
                console.log("⚠️ Unrecognized privateKey object:", privateKey);
                throw new Error("Could not extract privateKey from object");
            }
        } else if (typeof privateKey !== 'string') {
            throw new Error(`Private key must be a string or Buffer object, got: ${typeof privateKey}`);
        }
        // } else {
        // privateKey = JSON.stringify(privateKey);
        // console.log(privateKey);
        // throw new Error("Could not extract privateKey from object");
        // }

        let keypair;
        // const secretKey = Buffer.from(privateKey, 'base64');
        // console.log(secretKey);
        keypair = Ed25519Keypair.fromSecretKey(fromHex(privateKey));
        // keypair = Ed25519Keypair.fromSecretKey(secretKey);
        console.log("Successfully created keypair for address:", keypair.getPublicKey().toSuiAddress());
        if (!keypair) {
            throw new Error("Failed to create a valid keypair from the provided private key");
        }


        // console.log("Successfully created keypair. Public key:", keypair.getPublicKey().toSuiAddress());
        console.log("Successfully created keypair. Public key:", keypair);

        // Continue with sending SUI...
        // Your existing code to construct and send the transaction
        const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
        // Create a new transaction block
        const tx = new TransactionBlock();
        // const tx = new Transaction();
        
        // Convert SUI to MIST (1 SUI = 10^9 MIST)
        // const amountMist = BigInt(String(amount * 1e9));
        const amountMist = BigInt(Math.round(amount * 1e9));

        const ownedCoins = await client.getCoins({
            owner: keypair.getPublicKey().toSuiAddress(),
            coinType: "0x2::sui::SUI"
        });
        
        if (!ownedCoins || ownedCoins.data.length === 0) {
            throw new Error("No SUI coins found in the wallet");
        }
        
        console.log(`Found ${ownedCoins.data.length} coins in wallet`);

        // Transfer the specified amount
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountMist)]);
        console.log("Created coin for transfer:", coin);
        
        // Transfer the new coin to the recipient
        // Make sure coin is defined before transferring
        if (!coin) {
            throw new Error("Failed to create coin for transfer");
        }
        tx.transferObjects([coin], tx.pure(toAddress));
        tx.setGasBudget(10000000);

        // Sign and execute the transaction
        const result = await client.signAndExecuteTransactionBlock({
            // transaction: tx,
            transactionBlock: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });
        console.log(result);

        return result.digest;

    } catch (error) {
        console.error("Error in sendSui:", error);
        throw error;
    }
};



export async function createWithdrawWalletKeyboard(userId) {
    const user = await fetchUser(userId); // Make sure this returns the full user object
    if (!user || !Array.isArray(user.wallets)) {
        return {
            inline_keyboard: [[{ text: "❌ No wallets found", callback_data: "withdraw_cancel" }]],
        };
    }

    const rows = user.wallets.map((wallet, index) => [
        { text: `🔐 ${wallet.name || "Wallet"} (${shorten(wallet.wallletAddress)})`, callback_data: `withdraw_wallet_${index}` },
    ]);

    rows.push([
        { text: "✅ Continue", callback_data: "withdraw_continue" },
        { text: "❌ Cancel", callback_data: "withdraw_cancel" },
    ]);
    // console.log(rows);

    return { inline_keyboard: rows };
}


export function isValidSuiAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}