import admin from "firebase-admin";

// Initialize Firebase (replace with your service account key)
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// User data structure
interface UserData {
  walletAddress: string;
  privateKey: string; // Store encrypted in production!
  slippage?: number;
}

// Save/update user in Firestore
export async function saveUser(userId: number, data: UserData) {
  await db.collection("users").doc(userId.toString()).set(data, { merge: true });
}

// Get user from Firestore
export async function getUser(userId: number): Promise<UserData | null> {
  const doc = await db.collection("users").doc(userId.toString()).get();
  return doc.exists ? (doc.data() as UserData) : null;
}
