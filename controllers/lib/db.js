import admin from "firebase-admin";
import axios from 'axios';
import { Telegraf } from "telegraf";
import fs from 'fs'

// const file = await readFile('./serviceAccountKey.json', 'utf-8');
// const serviceAccount = JSON.parse(file);
// // Initialize Firebase (replace with your service account key)
import serviceAccount from '../../serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
// const bot = new Telegraf('7280147356:AAEiEsTxsJU0M2qvOyiXJEGz1lhP-K67iMA');
const originalBatch = db.batch;

db.batch = function () {
    console.warn("🔥 db.batch() was called from:");
    console.trace(); // Shows you exactly where it's called
    return originalBatch.call(this);
};

// // Save/update user in Firestore
export async function saveUser(userId, data) {
    const userRef = db.collection('users').doc(userId.toString());
    await userRef.set(data, { merge: true });
}
// fetch user
export async function fetchUser(userId) {
    const userRef = db.collection('users').doc(userId.toString());
    const doc = await userRef.get();

    return doc.exists ? doc.data() : null;
}
// // Get user from Firestore
export async function getUser(userId) {
    // const userId = ctx.from.id;
    // const chatId = ctx.chat.id;
    const user = await fetchUser(userId);
    if (!user) {
        // Send welcome message
        //bot.sendMessage(chatId, `👋 What can this bot do? 
        //  Fastest sniper/trading bot on SUI by $centron-bot 
        // Earn up to 35% of your friends' trading fees with our 5-layered referral system`
        // );

        // Save user
        await saveUser(userId, { firstVisit: Date.now() });
        //}
        const doc = await db.collection("users").doc(userId.toString()).get();
        return doc.exists ? (doc.data()) : null;
    }
}

export async function addWalletToUser(userId, wallet) {
    const db = admin.firestore();
    userId = String(userId);
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
        console.error("❌ Invalid userId:", userId);
        throw new Error("Invalid userId: must be a non-empty string");
    }
    // console.log("Saving wallet for userId:", userId);
    // console.log("Wallet:", wallet);

    const cleanWallet = {};
    for (const key in wallet) {
        if (wallet[key] !== undefined) {
            cleanWallet[key] = wallet[key];
        }
    }

    // ✅ Convert privateKey to Base64 string if it's not already
    if (cleanWallet.privateKey) {
        if (cleanWallet.privateKey instanceof Uint8Array || Buffer.isBuffer(cleanWallet.privateKey)) {
            cleanWallet.privateKey = Buffer.from(cleanWallet.privateKey).toString("hex");
        } else if (typeof cleanWallet.privateKey === "object") {
            // Convert object to string representation (if it's JSON serializable)
            cleanWallet.privateKey = JSON.stringify(cleanWallet.privateKey);
        } else if (typeof cleanWallet.privateKey !== "string") {
            throw new Error("❌ privateKey must be a string, Buffer, or Uint8Array");
        }
    }

    try {
        const dataToSave = {
            wallets: admin.firestore.FieldValue.arrayUnion(cleanWallet),
        };

        if (cleanWallet.walletAddress !== undefined) {
            dataToSave.walletAddress = cleanWallet.walletAddress;
        }
        await db.collection("users").doc(userId).set({
            ...dataToSave
            // walletAddress: cleanWallet.walletAddress,
            // wallets: admin.firestore.FieldValue.arrayUnion(cleanWallet)
        }, { merge: true });

        console.log("✅ Wallet saved to Firestore");
    } catch (error) {
        console.error("❌ Error saving wallet to Firestore:", error.message || error);
    }
}

//getting the private key
/**
 * Get the Base64-encoded private key for a user's wallet (Firebase Admin).
 * @param {string} telegramUserId - Telegram user ID. userId
 * @param {string} walletAddress - Wallet address to fetch the key for.
 * @returns {Promise<string>} - Base64-encoded private key.
 */
export async function getPrivateKey(userId, walletAddress) {
    if (!userId || !walletAddress) {
        throw new Error(`Invalid input: userId=${userId}, walletAddress=${walletAddress}`);
    }

    const userRef = admin.firestore().collection('users').doc(userId.toString());
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        throw new Error(`User ${userId} not found.`);
    }

    const userData = userSnap.data();

    const wallet = (userData.wallets || []).find(w => w.walletAddress === walletAddress);

    if (!wallet) {
        throw new Error(`Wallet ${walletAddress} not found for user ${telegramUserId}.`);
    }

    if (!wallet.privateKey) {
        throw new Error(`Private key missing for wallet ${walletAddress}.`);
    }

    return wallet.privateKey;
}

export async function getSeedPhrase(userId, walletAddress) {
    if (!userId || !walletAddress) {
        throw new Error(`Invalid input: userId=${userId}, walletAddress=${walletAddress}`);
    }

    const userRef = admin.firestore().collection('users').doc(userId.toString());
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        throw new Error(`User ${userId} not found.`);
    }

    const userData = userSnap.data();

    const wallet = (userData.wallets || []).find(w => w.seedPhrase === walletAddress);

    if (!wallet) {
        throw new Error(`Wallet ${walletAddress} not found for user ${userId}.`);
    }

    if (!wallet.seedPhrase) {
        throw new Error(`Private key missing for wallet ${walletAddress}.`);
    }

    return wallet.seedPhrase;
}


export async function setBuySlippage(userId, slippage) {
    return db.collection("users").doc(userId).set({
        settings: {
            buySlippage: slippage
        }
    }, { merge: true });
}

export async function updateBuySlippage(userId, walletAddress, slippage) {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;

    const userData = userSnap.data();
    const updatedWallets = userData.wallets.map(wallet => {
        if (wallet.walletAddress === walletAddress) {
            return { ...wallet, buySlippage: slippage };
        }
        return wallet;
    });

    await userRef.update({ wallets: updatedWallets });
}

export async function deleteUser(userId) {
    await db.collection("users").doc(userId.toString()).delete();
}


export async function updateWalletBalance(userId, walletAddress, newBalance) {
    const userRef = db.collection("users").doc(userId);
    const docSnap = await userRef.get();

    if (!docSnap.exists) return;

    const userData = docSnap.data();
    const updatedWallets = (userData.wallets || []).map(wallet =>
        wallet.address === walletAddress
            ? { ...wallet, balance: newBalance }
            : wallet
    );

    await userRef.update({ wallets: updatedWallets });
}
