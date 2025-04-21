import admin from "firebase-admin";

// // Initialize Firebase (replace with your service account key)
import serviceAccount from './serviceAccountKey.json'
// // const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// // User data structure
// // interface UserData {
// //   walletAddress: string;
// //   privateKey: string; // Store encrypted in production!
// //   slippage?: number;
// // }

// // Save/update user in Firestore
export async function saveUser(userId, data) {
    await db.collection("users").doc(userId.toString()).set(data, { merge: true });
}

// // Get user from Firestore
export async function getUser(userId) {
    const user = await getUser(userId);

    if (!user) {
        // Send welcome message
        bot.sendMessage(chatId, `👋 What can this bot do? 
            Fastest sniper/trading bot on SUI by $centron-bot 
            Earn up to 35% of your friends' trading fees with our 5-layered referral system`
        );

        // Save user
        await saveUser(userId, { firstVisit: Date.now() });
    }
    const doc = await db.collection("users").doc(userId.toString()).get();
    return doc.exists ? (doc.data()) : null;
}

export async function deleteUser(userId) {
    await db.collection("users").doc(userId.toString()).delete();
  }
