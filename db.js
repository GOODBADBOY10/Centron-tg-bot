// "use strict";
// var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
//     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
//     return new (P || (P = Promise))(function (resolve, reject) {
//         function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
//         function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
//         function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
//         step((generator = generator.apply(thisArg, _arguments || [])).next());
//     });
// };
// var __importDefault = (this && this.__importDefault) || function (mod) {
//     return (mod && mod.__esModule) ? mod : { "default": mod };
// };
// Object.defineProperty(exports, "__esModule", { value: true });
// exports.saveUser = saveUser;
// exports.getUser = getUser;
// const firebase_admin_1 = __importDefault(require("firebase-admin"));
// // Initialize Firebase (replace with your service account key)
// const serviceAccount = require("./serviceAccountKey.json");
// firebase_admin_1.default.initializeApp({
//     credential: firebase_admin_1.default.credential.cert(serviceAccount),
// });
// const db = firebase_admin_1.default.firestore();
// // Save/update user in Firestore
// function saveUser(userId, data) {
//     return __awaiter(this, void 0, void 0, function* () {
//         yield db.collection("users").doc(userId.toString()).set(data, { merge: true });
//     });
// }
// // Get user from Firestore
// function getUser(userId) {
//     return __awaiter(this, void 0, void 0, function* () {
//         const doc = yield db.collection("users").doc(userId.toString()).get();
//         return doc.exists ? doc.data() : null;
//     });
// }
