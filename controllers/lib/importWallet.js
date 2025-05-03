// import { fromExportedKeypair } from "@mysten/sui.js/keypairs/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as bip39 from 'bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { fromHex } from "../../utils/hex.js";

export async function importWalletFromInput(mnemonic) {
  if (!mnemonic || typeof mnemonic !== "string") {
    throw new Error("Input must be a non-empty string");
  }

  mnemonic = mnemonic.trim();
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
    const publicKey = keypair.getPublicKey().toSuiAddress();
    const secretKey = keypair.getSecretKey();
    // console.log(publicKey);
    return {
          address: publicKey,
          privateKey: Buffer.from(secretKey).toString("hex"),
          phrase: mnemonic,
          type: "mnemonic",
        };
    // return publicKey
}

// import { Ed25519Keypair } from "@mysten/sui.js/keypairs";
// import { isValidBIP39Mnemonic } from "@mysten/sui.js/cryptography";
// import { Buffer } from "buffer";

// export async function importWalletFromInput(input) {
//   input = input.trim();

//   // Mnemonic phrase import
//   if (isValidBIP39Mnemonic(input)) {
//     const keypair = Ed25519Keypair.deriveKeypair(input);
//     const address = keypair.getPublicKey().toSuiAddress();
//     const privateKey = Buffer.from(keypair.getSecretKey()).toString("base64");

//     return {
//       address,
//       privateKey,
//       phrase: input,
//       type: "mnemonic",
//     };
//   }

//   // Base64 private key import
//   try {
//     const secretKey = Buffer.from(input, "base64");
//     const keypair = Ed25519Keypair.fromSecretKey(secretKey);
//     const address = keypair.getPublicKey().toSuiAddress();

//     return {
//       address,
//       privateKey: input,
//       type: "privateKey",
//     };
//   } catch (err) {
//     throw new Error("Invalid input: Not a valid mnemonic or base64 private key");
//   }
// }
