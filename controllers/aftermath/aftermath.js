import { Aftermath } from "aftermath-ts-sdk";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";

const afSdk = new Aftermath("MAINNET");
await afSdk.init();
const router = afSdk.Router();
const pools = afSdk.Pools();
const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });


export const buyTokenWithAftermath = async ({ userId, tokenOut, suiAddress, suiAmount, phrase, slippage = 100, }) => {
  try {
    // console.log('phrase', phrase);
    if (!phrase) {
      console.error("❌ No mnemonic phrase provided for user:", userId);
      throw new Error("Mnemonic phrase is required");
    }
    const keypair = Ed25519Keypair.deriveKeypair(phrase);
    // console.log(keypair);

    // const amountIn = BigInt(suiAmount * 10 ** 9); // Convert SUI to base units
    const amountIn = BigInt(5_000_000_000); // Convert SUI to base units

    // console.log(Object.keys(afSdk));
    const quote = await router.getCompleteTradeRouteGivenAmountIn({
      // tokenIn: "0x2::sui::SUI",
      coinInType: "0x2::sui::SUI",
      // coinOutType: tokenOut,
      coinOutType: "0x468b99a00a0b4e5188cef9a7f431d57025774e7749314400881345229fb65d5c::suiper::SUIPER",
      coinInAmount: amountIn,
    });
    // console.log('quote', quote);

    const transaction = await router.getTransactionForCompleteTradeRoute({
      // trade: quote.trade,
      //   // suiAddress,
      walletAddress: "0x456f178712fe771207b107ba499b42d45e997ec96b81db62f7134c0f619a7e45",
      completeRoute: quote,
      // walletAddress: suiAddress,
      // gasBudget: BigInt(30_000_000), // 0.03 SUI as gas
      // maxSlippageBps: slippage,
      // returnOutputCoinArgument: false,
      slippage: 0.01
    });
    console.log('tx', transaction);
    // const tp = new TransactionBlock();
    // const result = await suiClient.signAndExecuteTransactionBlock({
    //   transactionBlock: tp,
    //   signer: keypair,
    //   options: {
    //     showObjectChanges: true,
    //     showBalanceChanges: true,
    //     showEffects: true,
    //   },
    // });
    // console.log("Trade Result:", result);
    // return result;
  } catch (error) {
    console.log('error happening', error)
  }
};



// export const buyTokenWithAftermath = async ({ tokenIn, tokenOut, amountIn, phrase, walletAddress, slippage }) => {
//   const route = await router.getCompleteTradeRouteGivenAmountIn({
//     coinInAmount: BigInt(amountIn), // amount in smallest unit
//     coinInType: tokenIn,
//     coinOutType: tokenOut,
//   });

//   const tx = new Transaction();
//   const { tx: newTx, coinOutId } = await router.addTransactionForCompleteTradeRoute({
//     tx,
//     completeRoute: route,
//     slippage,
//     walletAddress,
//   });

//   newTx.transferObjects([coinOutId], walletAddress);

//   // Sign and execute
//   const keypair = Ed25519Keypair.deriveKeypair(phrase);
//   const { digest, effects } = await suiClient.signAndExecuteTransaction({
//     transaction: newTx,
//     signer: keypair,
//     options: {
//       showEffects: true,
//       showObjectChanges: true,
//     },
//   });

//   return digest;
// };



// const quote = await router.getCompleteTradeRouteGivenAmountIn({
//       coinInType: "0x2::sui::SUI",
//       coinOutType: "0x468b99a00a0b4e5188cef9a7f431d57025774e7749314400881345229fb65d5c::suiper::SUIPER",
//       coinInAmount: amountIn,
//     });
//     // console.log('quote', quote);

//     const transaction = await router.getTransactionForCompleteTradeRoute({
//       walletAddress: "0x3161ccd892980b9b477ac4c78286e0ed33b43a107e9524b5491f1a5b62b59c10",
//       completeRoute: quote,
//       slippage: 0.01
//     });