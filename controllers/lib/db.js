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

// db.batch = function () {
//     console.warn("🔥 db.batch() was called from:");
//     console.trace(); // Shows you exactly where it's called
//     return originalBatch.call(this);
// };

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

//usersteps
// export async function saveUserStep(userId, stepData) {
//   const userRef = db.collection('users').doc(userId.toString());
//   await userRef.set({ step: stepData }, { merge: true });
// }

//fetch user steps
// export async function fetchUserStep(userId) {
//   const userRef = db.collection('users').doc(userId.toString());
//   const doc = await userRef.get();
//   if (!doc.exists) return null;
//   const userData = doc.data();
//   return userData.step || null;
// }

//update steps
// export async function updateUserStep(userId, newStepData) {
//   const userRef = db.collection('users').doc(userId.toString());
//   await userRef.update({ step: newStepData });
// }

// // Get user from Firestore
export async function getUser(userId, referrerCode) {
    let user = await fetchUser(userId);
    if (!user) {
        const referral = referrerCode ? referrerCode.replace('ref_', '') : null;
        await saveUser(userId, {
            referralCode: `ref_${userId}`,        // the code user can share
            referredBy: referral || null,         // the code they used to join
            referrals: 0,                         // will increment as they refer others
            step: {
                tokenAddress: "0x123...::TOKEN::ABC",
                tokenSymbol: "ABC"
            },
            firstVisit: Date.now()
        });

        user = await fetchUser(userId); // refetch after saving
    }
    // const step = user?.step || {};
    return user;
}

export async function incrementReferrer(referrerCode) {
    if (!referrerCode) return;

    const referrerId = referrerCode.replace('ref_', '');
    const userRef = db.collection('users').doc(referrerId);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) return;

            const current = doc.data().referrals || 0;
            t.update(userRef, { referrals: current + 1 });
        });
    } catch (e) {
        console.error(`Error incrementing referrals for ${referrerId}:`, e);
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

    if (!cleanWallet.walletAddress && cleanWallet.address) {
        cleanWallet.walletAddress = cleanWallet.address;
    }

    if (!cleanWallet.walletAddress) {
        throw new Error("❌ Wallet is missing a walletAddress.");
    }

    if (!cleanWallet.seedPhrase && !cleanWallet.privateKey) {
        throw new Error("❌ Wallet must have either a seed phrase or a private key.");
    }

    try {
        const userDocRef = db.collection("users").doc(userId);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const wallets = userData?.wallets || [];

            // ✅ Check if wallet already exists
            const exists = wallets.some(w => w.walletAddress === cleanWallet.walletAddress);
            if (exists) {
                throw new Error("❌ This wallet is already imported.");
            }
        }

        const dataToSave = {
            wallets: admin.firestore.FieldValue.arrayUnion(cleanWallet),
            walletAddress: cleanWallet.walletAddress // optional main walletAddress field
        };
        await userDocRef.set(dataToSave, { merge: true });
        console.log("✅ Wallet saved to Firestore");
    } catch (error) {
        console.error("❌ Error saving wallet to Firestore:", error.message || error);
    }
}

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


export async function setBuySlippage(userId, slippage, target) {
    const user = await fetchUser(userId);
    if (!user || !user.wallets) return;

    if (target === "all") {
        // Update all
        user.buyAllSlippage = slippage;
        user.wallets = user.wallets.map(w => ({ ...w, buySlippage: slippage }));
    } else if (typeof target === "number" && user.wallets[target]) {
        user.wallets[target].buySlippage = slippage;
    }

    await updateBuySlippage(userId, user); // update DB
}


export async function setSellSlippage(userId, slippage, target) {
    const user = await fetchUser(userId);
    if (!user || !user.wallets) return;

    if (target === "all") {
        // Update all
        user.sellAllSlippage = slippage;
        user.wallets = user.wallets.map(w => ({ ...w, sellSlippage: slippage }));
    } else if (typeof target === "number" && user.wallets[target]) {
        user.wallets[target].sellSlippage = slippage;
    }

    await updateSellSlippage(userId, user); // update DB
}


export async function updateBuySlippage(userId, target, slippage) {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        throw new Error(`User with ID ${userId} not found`);
    }

    const userData = userSnap.data();

    if (target === "all") {
        // Update all wallet slippage and buyAllSlippage
        const updatedWallets = (userData.wallets || []).map(wallet => ({
            ...wallet,
            buySlippage: slippage,
        }));

        await userRef.update({
            buyAllSlippage: slippage,
            wallets: updatedWallets,
        });
    } else if (typeof target === "number") {
        // Update only one wallet by index
        const wallets = [...(userData.wallets || [])];
        if (!wallets[target]) {
            throw new Error(`Wallet at index ${target} not found`);
        }

        wallets[target].buySlippage = slippage;

        await userRef.update({ wallets });
    } else {
        throw new Error(`Invalid target: ${target}`);
    }
}

export async function updateSellSlippage(userId, target, slippage) {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        throw new Error(`User with ID ${userId} not found`);
    }

    const userData = userSnap.data();

    if (target === "all") {
        // Update all wallet slippage and buyAllSlippage
        const updatedWallets = (userData.wallets || []).map(wallet => ({
            ...wallet,
            sellSlippage: slippage,
        }));

        await userRef.update({
            sellAllSlippage: slippage,
            wallets: updatedWallets,
        });
    } else if (typeof target === "number") {
        // Update only one wallet by index
        const wallets = [...(userData.wallets || [])];
        if (!wallets[target]) {
            throw new Error(`Wallet at index ${target} not found`);
        }

        wallets[target].sellSlippage = slippage;

        await userRef.update({ wallets });
    } else {
        throw new Error(`Invalid target: ${target}`);
    }
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

export async function updateUser(userId, updatedUserData) {
    const userRef = db.collection('users').doc(userId.toString());
    await userRef.set(updatedUserData, { merge: true });
}


export async function getReferralStats(userId) {
    const user = await fetchUser(userId);
    if (!user) return "User not found.";

    const link = `https://t.me/YOUR_BOT_USERNAME?start=${user.referralCode}`;
    const count = user.referrals || 0;

    return `🔗 Your reflink: ${link}\n👥 Referrals: ${count}`;
}
