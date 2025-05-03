import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as crypto from 'crypto';
import * as bip39 from 'bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export async function generate12WordMnemonic() {
  // 128 bits entropy for 12-word mnemonic
  const entropy = crypto.randomBytes(16); // 16 bytes = 128 bits
  const mnemonic = bip39.entropyToMnemonic(entropy.toString('hex'), wordlist);
  return mnemonic
}

export async function generateWallet() {
  const mnemonic = await generate12WordMnemonic();
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const publicKey = keypair.getPublicKey().toSuiAddress();

  return {
    seedPhrase: mnemonic,
    walletAddress: publicKey,
    privateKey: Buffer.from(keypair.getSecretKey()).toString('hex'),
  }
}
