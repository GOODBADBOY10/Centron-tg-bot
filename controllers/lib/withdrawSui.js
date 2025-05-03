import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { fromBase64, fromHex } from '@mysten/bcs';
import { mnemonicToSeedSync } from'@scure/bip39';
import { HDKey } from '@scure/bip32';

// import { bcs, fromHex, toHex } from '@mysten/bcs';
// import { fromB64 } from '@mysten/sui.js/utils';
import { shorten } from "../../utils/shorten.js";
import { fetchUser } from "./db.js";
import { userSteps } from "./userState.js";

export async function sendSui(privateKeyOrOptions, toAddressParam, amountParam) {
    try {
        let privateKey, toAddress, amount;
        if (typeof privateKeyOrOptions === 'object' && privateKeyOrOptions !== null) {
            console.log("Using options object format");
            // Extract values from the options object
            privateKey = privateKeyOrOptions.senderPrivateKey;
            toAddress = privateKeyOrOptions.to;
            amount = privateKeyOrOptions.amount;
        } else {
            // Using the traditional parameter approach
            privateKey = privateKeyOrOptions;
            toAddress = toAddressParam;
            amount = amountParam;
        }
        // Debug logging
        console.log("Input privateKey type:", typeof privateKey);
        console.log("Input privateKey length:", privateKey ? privateKey.length : 0);
        if (!toAddress) {
            throw new Error("Recipient address is required");
        }
        if (amount === undefined || amount === null) {
            throw new Error("Amount is required");
        }
        // Ensure privateKey is provided and is a string
        if (!privateKey) {
            throw new Error("Private key is required");
        }

        if (typeof privateKey !== 'string') {
            throw new Error("Private key must be a string");
        }

        // Remove any whitespace
        const trimmedPrivateKey = privateKey.trim();

        let keypair;

        // Case 1: Try to handle as a standard hex key (with or without 0x prefix)
        if (/^(0x)?[0-9a-fA-F]+$/.test(trimmedPrivateKey)) {
            const cleanPrivateKey = trimmedPrivateKey.startsWith('0x')
                ? trimmedPrivateKey.slice(2)
                : trimmedPrivateKey;

            if (cleanPrivateKey.length === 64) {
                // Standard hex private key format
                try {
                    const privateKeyBytes = Buffer.from(cleanPrivateKey, 'hex');
                    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
                    console.log("Created keypair from hex private key");
                } catch (error) {
                    console.error("Failed to create keypair from hex:", error);
                }
            } else {
                console.log(`Hex key with incorrect length: ${cleanPrivateKey.length}, expected 64`);
            }
        }

        // Case 2: Try to handle as Base64 encoded key
        if (!keypair && /^[A-Za-z0-9+/=]+$/.test(trimmedPrivateKey)) {
            try {
                // Decode base64 to bytes
                const privateKeyBytes = Buffer.from(trimmedPrivateKey, 'base64');

                // If the decoded bytes are 32 in length, it's likely a valid Ed25519 private key
                if (privateKeyBytes.length === 32) {
                    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
                    console.log("Created keypair from base64 private key");
                } else {
                    console.log(`Base64 decoded to incorrect length: ${privateKeyBytes.length}, expected 32`);
                }
            } catch (error) {
                console.error("Failed to create keypair from base64:", error);
            }
        }

        // Case 3: Try to handle as a JSON string containing a key
        if (!keypair && (trimmedPrivateKey.startsWith('{') || trimmedPrivateKey.startsWith('['))) {
            try {
                const keyObject = JSON.parse(trimmedPrivateKey);

                // Check common JSON key formats
                if (keyObject.privateKey) {
                    // Try recursive call with the extracted key
                    return sendSui(keyObject.privateKeyOrOptions, toAddress, amountParam);
                } else if (Array.isArray(keyObject) && keyObject.length === 32) {
                    // Handle case where it's a JSON array of bytes
                    keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(keyObject));
                    console.log("Created keypair from JSON byte array");
                }
            } catch (error) {
                console.error("Failed to parse as JSON:", error);
            }
        }

        // Case 4: Try as a mnemonic phrase (if it contains spaces and looks like words)
        if (!keypair && /^[a-z ]+$/.test(trimmedPrivateKey) && trimmedPrivateKey.includes(' ')) {
            try {
                // This requires the @scure/bip39 and @scure/bip32 packages
                const seed = mnemonicToSeedSync(trimmedPrivateKey);
                const hdKey = HDKey.fromMasterSeed(seed);

                // Derive the key using Sui's derivation path (m/44'/784'/0'/0'/0')
                const suiPath = "m/44'/784'/0'/0'/0'";
                const childKey = hdKey.derive(suiPath);

                if (childKey.privateKey) {
                    keypair = Ed25519Keypair.fromSecretKey(childKey.privateKey);
                    console.log("Created keypair from mnemonic phrase");
                }
            } catch (error) {
                console.error("Failed to create keypair from mnemonic:", error);
            }
        }

        // If we couldn't create a keypair with any method, throw an error
        if (!keypair) {
            throw new Error("Could not convert the provided string to a valid 32-byte Ed25519 private key. The input must be a 64-character hex string, a 32-byte base64 string, or a valid mnemonic phrase.");
        }

        console.log("Successfully created keypair. Public key:", keypair.getPublicKey().toSuiAddress());

        const client = new SuiClient({ url: getFullnodeUrl("mainnet") });
        // Continue with sending SUI...
        // Your existing code to construct and send the transaction
        // Create a new transaction block
        const tx = new TransactionBlock();

        // Convert SUI to MIST (1 SUI = 10^9 MIST)
        const amountMist = BigInt(Math.floor(amount * 1e9));

        // Transfer the specified amount
        const [coin] = tx.splitCoins(tx.gas, [amountMist]);
        tx.transferObjects([coin], toAddress);
        tx.setGasBudget(10000000);

        // Sign and execute the transaction
        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
        });

        return result.digest;

    } catch (error) {
        console.error("Error in sendSui:", error);
        throw error;
    }
}


export async function createWithdrawWalletKeyboard(userId) {
    const user = await fetchUser(userId); // Make sure this returns the full user object
    if (!user || !Array.isArray(user.wallets)) {
        return {
            inline_keyboard: [[{ text: "❌ No wallets found", callback_data: "withdraw_cancel" }]],
        };
    }

    const rows = user.wallets.map((wallet, index) => [
        { text: `🔐 ${wallet.name || "Wallet"} (${shorten(wallet.address)})`, callback_data: `withdraw_wallet_${index}` },
    ]);

    rows.push([
        { text: "✅ Continue", callback_data: "withdraw_continue" },
        { text: "❌ Cancel", callback_data: "withdraw_cancel" },
    ]);
    console.log(rows);

    return { inline_keyboard: rows };
}


export function isValidSuiAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}