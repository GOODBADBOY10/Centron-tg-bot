import * as crypto from 'crypto';
import * as bip39 from 'bip39';
import { getBalance } from './getBalance.js';
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import admin from "firebase-admin";
import { addWalletToUser } from './db.js';

const db = admin.firestore();

// Create a 12-word mnemonic
export async function generate12WordMnemonic() {
    const entropy = crypto.randomBytes(16); // 128 bits
    const mnemonic = bip39.entropyToMnemonic(entropy.toString("hex"));
    return mnemonic;
}
// Generate a new wallet and store it in Firebase
export async function generateNewWallet(userId) {
    const mnemonic = await generate12WordMnemonic();
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const publicKey = keypair.getPublicKey().toSuiAddress();

    // Optional: export private key as hex if needed
    const privateKey = Buffer.from(keypair.getSecretKey()).toString("hex");

    // Fetch current balance
    const balance = await getBalance(publicKey) ?? '0';
    console.log(balance);

    const wallet = {
        walletAddress: publicKey,
        seedPhrase: mnemonic,
        privateKey,
        balance,
        createdAt: Date.now()
    };
    // console.log(wallet)

    if (!userId) {
        throw new Error("Missing userId in generateNewWallet");
    }

    await addWalletToUser(userId, wallet); // your function from earlier
    return wallet;
}
