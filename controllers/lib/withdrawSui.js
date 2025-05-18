import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { mnemonicToSeedSync } from 'bip39';
import { fromHex } from '@mysten/sui/utils';
import { shorten } from "../../utils/shorten.js";
import { fetchUser } from "./db.js";
import { userSteps } from "./userState.js";


export async function sendSui(seedPhrase, toAddressParam, amountParam) {
    try {
        console.log("SendSui function called with:", {
            hasPrivateKey: !!seedPhrase,
            toAddress: toAddressParam,
            amount: amountParam
        });

        // Validate inputs early
        if (!seedPhrase) {
            throw new Error("Missing wallet seed phrase key");
        }

        if (!toAddressParam) {
            throw new Error("Missing recipient address");
        }

        if (!amountParam || typeof amountParam !== 'number' || amountParam <= 0) {
            throw new Error(`Invalid amount: ${amountParam}`);
        }
        console.log("Seed phrase type:", typeof seedPhrase);
        console.log("Seed phrase value:", seedPhrase);

        let privateKey = seedPhrase;
        const toAddress = toAddressParam;
        const amount = amountParam;

        if (typeof privateKey === 'object') {
            if (privateKey?.type === 'Buffer' && Array.isArray(privateKey?.data)) {
                privateKey = Buffer.from(privateKey.data).toString('hex');
            } else if (typeof privateKey.seedPhrase === 'string') {
                // If privateKey is nested inside an object
                privateKey = privateKey.seedPhrase;
            } else {
                console.log("⚠️ Unrecognized privateKey object:", privateKey);
                throw new Error("Could not extract privateKey from object");
            }
        } else if (typeof privateKey !== 'string') {
            throw new Error(`Private key must be a string or Buffer object, got: ${typeof privateKey}`);
        }
        // let keypair;
        // const fullKey = fromHex(privateKey); // full keypair (likely 64+ bytes)
        // const secretKey = fullKey.slice(-32); // extract the actual 32-byte secret key
        // keypair = Ed25519Keypair.fromSecretKey(secretKey);
        // console.log("Successfully created keypair for address:", keypair.getPublicKey().toSuiAddress());
        const keypair = Ed25519Keypair.deriveKeypair(privateKey, "m/44'/784'/0'/0'/0'");
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
            // owner: privateKey,
            owner: keypair.getPublicKey().toSuiAddress(),
            coinType: "0x2::sui::SUI"
        });
        console.log('owned coins', ownedCoins);

        if (ownedCoins.data.length === 0) {
            console.log("No SUI coins found in wallet");
            // console.log(`Found ${ownedCoins.data.length} coins in wallet:`);
            return false;
        }

        // Log each coin with its actual balance
        console.log(`Found ${ownedCoins.data.length} coins in wallet:`);
        ownedCoins.data.forEach((coin, index) => {
            console.log(`Coin ${index + 1}: ID=${coin.coinObjectId}, Balance=${coin.balance}`);
        });

        // Transfer the specified amount
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountMist)]);
        console.log("Created coin for transfer:", coin);

        // Transfer the new coin to the recipient
        // Make sure coin is defined before transferring
        if (!coin) {
            throw new Error("Failed to create coin for transfer");
        }
        tx.transferObjects([coin], tx.pure(toAddress));

        const gasCoin = {
            objectId: ownedCoins.data[0].coinObjectId,
            digest: ownedCoins.data[0].digest,
            version: ownedCoins.data[0].version
        };

        console.log("Setting gas coin:", gasCoin);
        tx.setGasPayment([gasCoin]);

        // Also set a realistic gas budget
        tx.setGasBudget(10000000); // 0.01 SUI

        console.log("Created transaction block:", tx);

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