import { Aftermath } from "aftermath-ts-sdk";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";

export const buyTokenWithAftermath = async ({ tokenAddress, phrase, suiAmount, slippage }) => {
  console.log('parameters', tokenAddress, phrase, suiAmount, slippage);
  try {
    if (!tokenAddress || !phrase || !suiAmount || !slippage) {
      throw new Error("Missing required parameters");
    }
    const client = new SuiClient({
      url: getFullnodeUrl("mainnet")
    });

    const afsdk = new Aftermath("MAINNET");
    await afsdk.init();
    const router = afsdk.Router();
    const keyPair = Ed25519Keypair.deriveKeypair(phrase);
    // console.log('key pair', keyPair);
    const walletAddress = keyPair.getPublicKey().toSuiAddress();
    // console.log('wallet address:', walletAddress);
    // get balance and validate
    const balances = await client.getAllBalances({
      owner: walletAddress
    });
    // console.log('balances', balances);
    const suiBalanceObj = balances.find(balance => balance.coinType === "0x2::sui::SUI");
    console.log('sui balabce object', suiBalanceObj);
    const suiBalance = suiBalanceObj ? BigInt(suiBalanceObj.totalBalance) : 0;
    console.log(suiBalance);

    if (suiBalance < BigInt(suiAmount)) {
      throw new Error(`Insufficient SUI balance`);
    }

    // Execute swap
    const route = await router.getCompleteTradeRouteGivenAmountIn({
      coinInType: '0x2::sui::SUI',
      coinOutType: tokenAddress,
      coinInAmount: BigInt(suiAmount),
    });

    const txBlock = await router.getTransactionForCompleteTradeRoute({
      walletAddress,
      completeRoute: route,
      slippage,// 1% slippage
    });

    const result = await client.signAndExecuteTransaction({
      signer: keyPair,
      transaction: txBlock,
    });

    return {
      transactionDigest: result.digest,
      walletAddress,
      amountIn: suiAmount,
      tokenAddress
    };
  } catch (error) {
    console.log('error happening', error)
    throw error;
  }
};


export const sellTokenWithAftermath = async ({ tokenAddress, phrase, suiPercentage, slippage }) => {
  console.log('parameters', tokenAddress, phrase, suiPercentage, slippage);
  try {
    if (!tokenAddress || !phrase || !suiPercentage || !slippage) {
      throw new Error("Missing required parameters");
    }
    const client = new SuiClient({
      url: getFullnodeUrl("mainnet")
    });

    const afsdk = new Aftermath("MAINNET");
    await afsdk.init();
    const router = afsdk.Router();
    const keyPair = Ed25519Keypair.deriveKeypair(phrase);
    // console.log('key pair', keyPair);
    const walletAddress = keyPair.getPublicKey().toSuiAddress();
    // console.log('wallet address:', walletAddress);
    // get balance and validate
    const balances = await client.getAllBalances({
      owner: walletAddress
    });
    // console.log('balances', balances);
    // const suiBalanceObj = balances.find(balance => balance.coinType === "0x2::sui::SUI");
    // console.log('sui balabce object', suiBalanceObj);
    // const suiBalance = suiBalanceObj ? BigInt(suiBalanceObj.totalBalance) : 0;
    // console.log(suiBalance);

     // Find token balance (not SUI!)
    const tokenBalanceObj = balances.find(b => b.coinType === tokenAddress);
    const totalBalance = tokenBalanceObj ? BigInt(tokenBalanceObj.totalBalance) : 0n;

    if (totalBalance === 0n) {
      throw new Error("You have no balance of this token to sell.");
    }

    const tokenAmount = (totalBalance * BigInt(suiPercentage)) / 100n;

    if (tokenAmount === 0n) {
      throw new Error("Token amount to sell is too small.");
    }

    // Execute swap
    const route = await router.getCompleteTradeRouteGivenAmountIn({
      coinInType: tokenAddress,
      coinOutType: '0x2::sui::SUI',
      coinInAmount: tokenAmount,
    });

    const txBlock = await router.getTransactionForCompleteTradeRoute({
      walletAddress,
      completeRoute: route,
      slippage: slippage, // 1% slippage
    });

    const result = await client.signAndExecuteTransaction({
      signer: keyPair,
      transaction: txBlock,
    });

    return {
      transactionDigest: result.digest,
      walletAddress,
      amountIn: tokenAmount,
      tokenAddress
    };
  } catch (error) {
    console.log('error happening', error)
    throw error;
  }
};


// step tone recycle improve palace fashion boring sleep welcome solid cloud tomato


  // try {
  //     const data = await getInsidexTokenDetails(tokenAddress);
  //     console.log('data', data);
  //     const result = await getFallbackTokenDetails(tokenAddress, selectedWallets[0]);
  //     // console.log(result);
  //     if (!result) {
  //       return ctx.reply("❌ Token not found or no liquidity.");
  //     }
  //     const { tokenInfo, source } = result;
  //     // let tokenBalance = { balance: 0, balanceUsd: 0 };
  //     // let suiBalance = 0;
  //     const isSuiPair = tokenInfo.data.quoteToken.symbol === "SUI";

  //     const balances = await Promise.all(selectedWallets.map(async (wallet) => {
  //       const tokenBalance = isSuiPair
  //         ? await getCoinBalance(wallet, tokenInfo.data.baseToken.address)
  //         : { balance: 0, balanceUsd: 0 };
  //       const suiBalance = await getBalance(wallet);

  //       return {
  //         wallet,
  //         suiBalance,
  //         tokenBalance
  //       };
  //     }));
  //     const tokenName = tokenInfo?.data.baseToken.name;
  //     const tokenSymbol = tokenInfo?.data.baseToken.symbol;
  //     const quoteSymbol = tokenInfo?.data.quoteToken.symbol;
  //     // const formattedLiquidity = formatPrice(Number(tokenInfo?.data.liquidity.usd));

  //     let formattedMessage = `CENTRON BOT⚡\n\n`;
  //     formattedMessage += `📈 ${tokenName} (${tokenSymbol}/${quoteSymbol})\n\n`;
  //     formattedMessage += `🪙 CA: <code> ${tokenInfo?.data.baseToken.address} </code> \n`;
  //     formattedMessage += `💵 Price (USD): $${tokenInfo?.data.priceUsd}\n`;
  //     formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo?.data.marketCap))}\n`;
  //     // formattedMessage += `🔄 LP: ${tokenInfo?.data.dexId}\n\n`;
  //     // formattedMessage += `💱 Price: ${tokenInfo?.data.priceNative} ${quoteSymbol}\n`;
  //     // formattedMessage += `💧 Liquidity (USD): ${formattedLiquidity}\n\n`;

  //     // formattedMessage += `📊 FDV: ${formatPrice(Number(tokenInfo?.data.fdv))}\n`;
  //     formattedMessage += `📅 Created: ${new Date(tokenInfo?.data.pairCreatedAt).toLocaleString()}\n\n`;

  //     formattedMessage += `Selected Wallets:\n`;
  //     balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
  //       // formattedMessage += `🟢 \`${wallet}\`\n`;
  //       formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} | ${tokenSymbol} | $${tokenBalance.balanceUsd} \n`;
  //       // formattedMessage += `   🔹 SUI: ${suiBalance} 💧\n`;
  //       // formattedMessage += `   🔸 ${tokenSymbol}: ${tokenBalance.balance} | $${tokenBalance.balanceUsd}\n\n`;
  //     });

  //     if (!userSteps[userId]) userSteps[userId] = {};
  //     userSteps[userId].tokenInfo = tokenInfo;
  //     userSteps[userId].tokenAddress = tokenAddress;
  //     userSteps[userId].wallets = wallets.map(w => w.address);
  //     // Also save phrase here if you want
  //     // const currentWalletObj = wallets.find(w => (w.address || w.walletAddress).toLowerCase() === (userSteps[userId]?.currentWallet || '').toLowerCase());
  //     // userSteps[userId].seedPhrase = currentWalletObj?.seedPhrase || currentWalletObj?.phrase || null;

  //     const keyboard = {
  //       inline_keyboard: buildFullKeyboard(selectedWallets, wallets.map(w => w.address))
  //     };

  //     if (userSteps[userId]?.mainMessageId) {
  //       // Try editing the existing main message
  //       try {
  //         await ctx.telegram.editMessageText(
  //           ctx.chat.id,
  //           userSteps[userId].mainMessageId,
  //           undefined,
  //           formattedMessage,
  //           {
  //             parse_mode: "HTML",
  //             reply_markup: keyboard
  //           }
  //         );
  //       } catch (err) {
  //         console.warn("editMessageText failed, sending new message instead");
  //         const sent = await ctx.reply(formattedMessage, {
  //           parse_mode: "HTML",
  //           reply_markup: keyboard
  //         });
  //         userSteps[userId].mainMessageId = sent.message_id;
  //       }
  //     } else {
  //       // First time showing main message
  //       const sent = await ctx.reply(formattedMessage, {
  //         parse_mode: "HTML",
  //         reply_markup: keyboard
  //       });
  //       userSteps[userId].mainMessageId = sent.message_id;
  //     }

  //   } catch (error) {
  //     console.error(error);
  //     ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
  //   }







  // export async function renderMainMessage(ctx, userId) {
  //   const step = userSteps[userId];
  //   const selectedWallets = step.selectedWallets || [];
  //   const tokenInfo = step.tokenInfo;
  //   const tokenSymbol = tokenInfo?.data?.baseToken?.symbol;
  //   const tokenName = tokenInfo?.data?.baseToken?.name;
  //   const quoteSymbol = tokenInfo?.data?.quoteToken?.symbol;
  //   const isSuiPair = quoteSymbol === "SUI";
  
  //   const balances = await Promise.all(selectedWallets.map(async (wallet) => {
  //     const tokenBalance = isSuiPair
  //       ? await getCoinBalance(wallet, tokenInfo.data.baseToken.address)
  //       : { balance: 0, balanceUsd: 0 };
  //     const suiBalance = await getBalance(wallet);
  //     return { wallet, suiBalance, tokenBalance };
  //   }));
  
    
  
  //   let formattedMessage = `<code>CENTRON BOT⚡</code>\n\n`;
  //   formattedMessage += `📈 ${tokenName} (${tokenSymbol}/${quoteSymbol})\n\n`;
  //   formattedMessage += `🪙 CA:<code> ${tokenInfo?.data.baseToken.address} </code> \n`;
  //   formattedMessage += `💵 Price (USD): $${tokenInfo?.data.priceUsd}\n`;
  //   formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo?.data.marketCap))}\n`;
  //   formattedMessage += `📅 Created: ${new Date(tokenInfo?.data.pairCreatedAt).toLocaleString()}\n\n`;
  
  //   formattedMessage += `Selected Wallets:\n`;
  //   balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
  //     formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} | ${tokenSymbol} | $${tokenBalance.balanceUsd} \n`;
  //   });
  
  //   const keyboard = {
  //     inline_keyboard: buildFullKeyboard(selectedWallets, step.wallets)
  //   };
  
  //   try {
  //     await ctx.telegram.editMessageText(
  //       ctx.chat.id,
  //       step.mainMessageId,
  //       undefined,
  //       formattedMessage,
  //       {
  //         parse_mode: "HTML",
  //         reply_markup: keyboard
  //       }
  //     );
  //   } catch (e) {
  //     console.warn("Failed to update message:", e.message);
  //   }
  // }