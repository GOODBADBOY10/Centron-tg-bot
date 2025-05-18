import { AggregatorClient, Env } from "@cetusprotocol/aggregator-sdk";
import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs";
import { BN } from "bn.js";
import dotenv from "dotenv";

dotenv.config();

const SUI_RPC = "https://fullnode.mainnet.sui.io";
const OVERLAY_FEE_RECEIVER = process.env.OVERLAY_FEE_RECEIVER || process.env.WALLET_ADDRESS;

// Initialize Sui Client
const suiClient = new SuiClient({ url: SUI_RPC });

function getKeypairFromPhrase(phrase) {
  return Ed25519Keypair.deriveKeypair(phrase);
}

export const buyTokenCetusWithOutput = async (tokenOut, walletAddress, amountIn, phrase) => {
  try {
    const tokenIn = "0x2::sui::SUI";
    const amountInAtomic = new BN(amountIn * 1e9);
    const keypair = getKeypairFromPhrase(phrase);

    const aggregator = new AggregatorClient({
      client: suiClient,
      signer: walletAddress,
      env: Env.Mainnet,
      overlayFeeRate: 0.01,
      overlayFeeReceiver: OVERLAY_FEE_RECEIVER,
    });

    // 🔍 Get swap route
    const routers = await aggregator.findRouters({
      from: tokenIn,
      target: tokenOut,
      amount: amountInAtomic,
      byAmountIn: true,
    });

    if (!routers || routers.length === 0) {
      console.error("❌ No route found");
      return { success: false, error: "No route found" };
    }

    const txb = new TransactionBlock();

    // 🪙 Split input coin (for fixed amount swap)
    const [inputCoin] = txb.splitCoins(txb.gas, [txb.pure(amountInAtomic.toString())]);

    // 🛠️ Use routerSwap to get output coin
    const targetCoin = await aggregator.routerSwap({
      routers: routers,
      byAmountIn: true,
      txb,
      inputCoin,
      slippage: 0.01,
    });

    // ✉️ You can optionally transfer the output coin
    // txb.transferObjects([targetCoin], txb.pure(walletAddress));

    // Or destroy the coin if you want
    // aggregator.transferOrDestoryCoin(txb, targetCoin, tokenOut);

    const response = await suiClient.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });

    return {
      success: true,
      digest: response.digest,
      balanceChanges: response.balanceChanges,
      objectChanges: response.objectChanges,
    };
  } catch (err) {
    console.error("❌ Error in buyTokenCetusWithOutput:", err);
    return { success: false, error: err.message || err };
  }
};
