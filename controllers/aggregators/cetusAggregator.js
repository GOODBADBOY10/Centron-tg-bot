import { AggregatorClient } from "@cetusprotocol/aggregator-sdk"
import { TransactionBlock } from "@mysten/sui.js/transactions";
// import { Transaction } from '@mysten/sui/transactions';
import BN from "bn.js"

// const client = new AggregatorClient({})


export const buyTokenCetusWithOutput = async (userId, client, tokenAddress, walletAddress, suiAmount, phrase, slippage = 0.01) => {
  try {

    const amount = new BN(suiAmount * 1e9)
    const from = "0x2::sui::SUI"
    // const target = "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"
    const target = tokenAddress

    const routers = await client.findRouters({
      from,
      target,
      amount,
      byAmountIn: true, // `true` means fix input amount, `false` means fix output amount
    })
    console.log('routers', routers);

    if (!routers || routers.length === 0) {
      console.log("❌ No swap route found.");
      return false;
    }

    const txb = new TransactionBlock();

    const [inputCoin] = txb.splitCoins(txb.gas, [txb.pure(amount.toString())]);
    console.log("The input coins are: ", inputCoin,)

    const targetCoin = await client.routerSwap({
      routers,
      txb,
      inputCoin,
      slippage,
    })
    console.log('target coins:', targetCoin);

    // const userAddress = signer.toSuiAddress();
    const userAddress = walletAddress;
    client.transferOrDestoryCoin(txb, targetCoin, userAddress);

    // you can use this target coin object argument to build your ptb.
    // client.transferOrDestoryCoin(
    // txb,
    // targetCoin,
    // target
    // )

    // 5. Sign and send
    const result = await signer.signAndExecuteTransactionBlock({
      transactionBlock: txb,
      options: { showEffects: true },
    });


    console.log("✅ Token purchased successfully:", result.digest);
    return true;

  } catch (err) {
    console.error("❌ Error in buyTokenCetusWithOutput:", err);
    return { success: false, error: err.message || err };
  }
};
