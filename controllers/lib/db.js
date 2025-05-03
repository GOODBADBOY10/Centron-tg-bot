import admin from "firebase-admin";
import axios from 'axios';
import { Telegraf } from "telegraf";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from 'fs'

// const file = await readFile('./serviceAccountKey.json', 'utf-8');
// const serviceAccount = JSON.parse(file);
// // Initialize Firebase (replace with your service account key)
import serviceAccount from '../../serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const bot = new Telegraf('7280147356:AAH9c1N2lDKouexctsDd7x1fmATylHb-Lis');
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
    console.log("Saving wallet for userId:", userId);
    console.log("Wallet:", wallet);

    const cleanWallet = {};
    for (const key in wallet) {
        if (wallet[key] !== undefined) {
            cleanWallet[key] = wallet[key];
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
