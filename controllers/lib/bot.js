import { Telegraf } from "telegraf";
import { session } from 'telegraf';
import { saveUser, getUser, fetchUser, addWalletToUser } from "./db.js";
import { getBalance } from "./getBalance.js";
import { generateWallet } from "./generateWallet.js";
import { importWalletFromInput } from "./importWallet.js";
import { handleAction } from "./handleAction.js";
import { mainMenu } from "./mainMenu.js";
import { handleWallets } from "./handleWallets.js";
import { generateNewWallet } from "./genNewWallet.js";
import { userSteps } from "./userState.js";
import { formatPrice, getCoinBalance, getInsidexTokenDetails, getTokenDetails } from "../../utils/getTokenDetails.js";
import { handleBuySlippage, handleSellSlippage, updateAllBuyWalletsSlippage, updateAllSellWalletsSlippage } from "./buySlippage.js";
import { updateBuySlippage } from "./db.js";
import { updateSellSlippage } from "./db.js";
import { incrementReferrer } from "./db.js";
import { buyTokenWithAftermath, sellTokenWithAftermath } from "../aftermath/aftermath.js";
import { toSmallestUnit } from "./suiAmount.js";
import { fetchUserStep } from "./db.js";
import { updateUserStep } from "./db.js";
import { saveUserStep } from "./db.js";
import { cleanObjectDeep } from "../../utils/shallow.js";
import { handleConfig } from "./handleConfig.js";
import { handleReferrals } from "./handleReferrals.js";
import { handleBuy } from "./handleBuy.js";
import { handleSell } from "./handleSell.js";
import { handleStart } from "./handleStart.js";
import { handleContinue } from "./handleContinue.js";
import { saveOrUpdatePosition } from "./db.js";


// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Telegraf('7280147356:AAEiEsTxsJU0M2qvOyiXJEGz1lhP-K67iMA');
bot.use(session());

// /start → Generate wallet + save to Firestore
bot.start(handleStart);

// ➡️ Continue handler (you can show the menu here)
bot.hears("➡️ Continue", handleContinue);


async function getFallbackTokenDetails(tokenAddress, walletAddress) {
  try {
    const tokenInfo = await getInsidexTokenDetails(tokenAddress);
    if (tokenInfo?.length) {
      return {
        tokenInfo: tokenInfo[0], // Take first item from array
        source: "Insidex"
      };
    }
  } catch (err) {
    console.log('Insidex failed:', err.message || err);
  }

  try {
    const tokenInfo = await getTokenDetails(tokenAddress, walletAddress);
    if (tokenInfo) {
      return {
        tokenInfo,
        source: "Dexscreener"
      };
    }
  } catch (err) {
    console.log('Dexscrener failed:', err.message || err);
  }

  return null;
}

function shortAddress(address) {
  if (typeof address !== "string") {
    console.error("Expected address to be a string but got:", address);
    return "InvalidAddr";
  }

  if (address.length < 10) {
    console.warn("Address too short to abbreviate:", address);
    return address;  // or return "ShortAddr" if you prefer a label
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getReferralCode(userId) {
  return `ref_${Buffer.from(userId.toString()).toString('base64').slice(0, 6)}`;
}

export function buildFullKeyboard(selectedWallets, allWallets, showAll = false, mode = "buy") {
  console.log("buildFullKeyboard called with mode:", mode, selectedWallets);

  const selectedLower = selectedWallets
    .map(a => (typeof a === 'string' ? a.toLowerCase() : ''))
    .filter(Boolean);

  const allLower = allWallets
    .map(w => (typeof w === 'string' ? w.toLowerCase() : ''))
    .filter(Boolean);

  const walletCount = allLower.length;
  const walletsToShow = showAll ? allLower : allLower.slice(0, 4);

  const rows = [];

  // Only show wallet-related buttons if there are 2 or more wallets
  if (walletCount > 1) {
    // Toggle "Show All" / "Show Less"
    rows.push([
      { text: showAll ? "💳 Less Wallets 💳" : "💳 All Wallets 💳", callback_data: "toggle_all_wallets" }
    ]);

    // Display wallets two per row
    for (let i = 0; i < walletsToShow.length; i += 2) {
      const row = [];
      for (let j = i; j < i + 2 && j < walletsToShow.length; j++) {
        const address = walletsToShow[j];
        const isSelected = selectedLower.includes(address);
        row.push({
          text: `${isSelected ? "🟢" : "🔘"} ${shortAddress(address)}`,
          callback_data: `toggle_wallet:${j}`,
        });
      }
      rows.push(row);
    }
  }

  // Toggle buy/sell
  rows.push([
    { text: "Buy ↔ Sell", callback_data: "toggle_mode" }
  ]);

  // Action buttons based on mode
  const prefixIcon = mode === "buy" ? "🛒" : "💸";
  const action = mode;
  if (mode === "buy") {
    rows.push([
      { text: `${prefixIcon} Buy 1 SUI`, callback_data: `${action}_1` },
      { text: `${prefixIcon} Buy 5 SUI`, callback_data: `${action}_5` }
    ]);
    rows.push([
      { text: `${prefixIcon} Buy X SUI`, callback_data: `${action}_x` }
    ]);
  } else {
    rows.push([
      { text: `${prefixIcon} Sell 25%`, callback_data: `${action}_25` },
      { text: `${prefixIcon} Sell 50%`, callback_data: `${action}_50` }
    ]);
    rows.push([
      { text: `${prefixIcon} Sell 100%`, callback_data: `${action}_100` }
    ]);
  }

  // Cancel + Refresh
  rows.push([
    { text: "❌ Cancel", callback_data: "cancel_to_main" },
    { text: "🔄 Refresh", callback_data: "refresh_info" }
  ]);

  return rows;
}

export async function renderMainMessage(ctx, userId) {
  const step = await fetchUserStep(userId);
  if (!step) {
    console.warn("No step found for user", userId);
    return;
  }

  const selectedWallets = step.selectedWallets || [];
  const tokenInfo = step.tokenInfo;
  if (!tokenInfo) {
    console.warn("No tokenInfo in step for user", userId);
    return;
  }

  const tokenName = tokenInfo.name;
  const tokenSymbol = tokenInfo.symbol;
  const token_address = tokenInfo.address;

  const balances = await Promise.all(selectedWallets.map(async (wallet) => {
    const tokenBalance = await getCoinBalance(wallet, token_address);
    const suiBalance = await getBalance(wallet);
    return { wallet, suiBalance, tokenBalance };
  }));

  let formattedMessage = `CENTRON BOT⚡\n\n`;
  formattedMessage += `📈 ${tokenName} (${tokenSymbol}/SUI)\n\n`;
  formattedMessage += `🪙 CA: <code>${token_address}</code>\n`;
  formattedMessage += `💵 Price (USD): $${tokenInfo.price}\n`;
  formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo.marketCap))}\n`;
  formattedMessage += `🧬 Coin Type: ${tokenInfo.coinType || "N/A"}\n`;
  formattedMessage += `📅 Created: ${new Date(tokenInfo.date).toLocaleString()}\n\n`;
  formattedMessage += `Selected Wallets:\n`;
  balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
    formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} ${tokenSymbol} | $${tokenBalance.balanceUsd} \n`;
  });

  const keyboard = {
    inline_keyboard: buildFullKeyboard(
      selectedWallets,
      step.wallets,
      step.showAllWallets ?? false,
      step.mode
    )
  };

  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      step.mainMessageId,
      undefined,
      formattedMessage,
      {
        parse_mode: "HTML",
        reply_markup: keyboard
      }
    );
  } catch (e) {
    console.warn("Failed to update message:", e.message);
  }
}


bot.command("wallets", async (ctx) => {
  const userId = ctx.from.id;
  return await handleWallets(ctx, userId);
});

bot.command("config", async (ctx) => {
  const userId = ctx.from.id;
  return await handleConfig(ctx, userId);
});

bot.command("referrals", async (ctx) => {
  const userId = ctx.from.id;
  await handleReferrals(ctx, userId);
});

bot.command("buy", async (ctx) => {
  const userId = ctx.from.id;
  await handleBuy(ctx, userId);
});

bot.command("sell", async (ctx) => {
  const userId = ctx.from.id;
  await handleSell(ctx, userId);
});

bot.command("positions", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.reply("Positions not set yet");
});


bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const text = ctx.message.text?.trim();
  const replyTo = ctx.message?.reply_to_message?.text;
  // const step = userSteps[userId];
  const step = await fetchUserStep(userId);
  // const user = await fetchUser(userId);

  if (!text) return;

  //connecting wallet
  if (ctx.message?.reply_to_message?.text?.includes("mnemonic") || ctx.message?.reply_to_message?.text?.includes("privatekey")) {
    const userInput = ctx.message.text.trim();
    // console.log(userInput);
    try {
      const imported = await importWalletFromInput(userInput);
      console.log(userInput);
      const userToString = userId.toString();
      // if (!imported) throw new Error('No found') 
      // console.log(imported);

      await addWalletToUser(userToString, {
        address: imported.address,
        privateKey: imported.privateKey,
        ...(imported.phrase ? { seedPhrase: imported.phrase } : {}),
      });

      await saveUser(userId, { awaitingWallet: false });

      await ctx.reply(`✅ Wallet connected!\n\n*Address:* \`${imported.address}\`\n*Type:* ${imported.type}`, {
        parse_mode: "Markdown"
      });

      return handleWallets(ctx, userId);

    } catch (err) {
      console.error("Import error:", err);
      return ctx.reply("❌ Invalid input. Please send a valid *SUI mnemonic phrase* or *private key*.", {
        parse_mode: "Markdown"
      });
    }
  }

  // generating wallets
  if (replyTo && replyTo.includes("How many wallets would you like to generate")) {
    const count = parseInt(ctx.message.text);

    if (isNaN(count) || count < 1 || count > 10) {
      return ctx.reply("❌ Please enter a number between 1 and 10.");
    }

    await ctx.reply(`Generating ${count} wallet(s)...`);

    for (let i = 0; i < count; i++) {
      const { walletAddress, privateKey, seedPhrase } = await generateNewWallet();

      await addWalletToUser(userId, {
        address: walletAddress,
        privateKey,
        ...(seedPhrase ? { seedPhrase } : {}),
        walletAddress,
        type: seedPhrase ? "mnemonic" : "privateKey"
      });

      await ctx.reply(
        `🎉 Wallet #${i + 1}\n📌 Address: \`${walletAddress}\`\n🔐 Private Key: \`${privateKey}\``,
        { parse_mode: "Markdown" }
      );
    }

    await ctx.reply("✅ All wallets generated!");
  }

  // slippage
  if (step?.awaitingSlippageInput) {
    const userToString = String(userId);
    const slippage = parseFloat(text);
    if (isNaN(slippage) || slippage <= 0 || slippage > 50) {
      return ctx.reply("❌ Invalid slippage. Please enter a number between 0.1 and 50.", {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true
        }
      });
    }
    // console.log("Valid slippage:", slippage);
    // console.log("Step scope:", step.scope, "type:", step.type);

    try {
      if (step.scope === "all" && step.type === "buy") {
        await updateAllBuyWalletsSlippage(userToString, slippage);
        await handleBuySlippage(ctx, userId);
        await ctx.reply(`✅ Buy slippage updated to ${slippage}% for all wallets`);
      } else if (step.scope === "all" && step.type === "sell") {
        await updateAllSellWalletsSlippage(userToString, slippage);
        await ctx.reply(`✅ Sell slippage updated to ${slippage}% for all wallets`);
        await handleSellSlippage(ctx, userId);
      } else if (step.awaitingSlippageInput && step.slippageTarget !== undefined) {
        const target = step.slippageTarget;
        if (step.type === "buy") {
          await updateBuySlippage(userToString, target, slippage);
          await ctx.reply(`✅ Buy slippage updated to ${slippage}%`);
          await handleBuySlippage(ctx, userId);
        } else if (step.type === "sell") {
          await updateSellSlippage(userToString, target, slippage);
          await ctx.reply(`✅ Sell slippage updated to ${slippage}%`);
          await handleSellSlippage(ctx, userId);
        }
      }

      await updateUserStep(userId, {});
      // delete userSteps[userId]; // Clean up
      return;
    } catch (err) {
      console.error(err);
      return ctx.reply("❌ Failed to update slippage.");
    }
  }


  if (step?.state === "awaiting_buy_token_address") {
    const userId = ctx.from.id;
    const tokenAddress = ctx.message.text?.trim();

    let step = await fetchUserStep(userId);
    if (!step) {
      return ctx.reply("❌ Session expired or not found. Please start again.");
    }

    const mode = step.mode;
    const user = await getUser(userId);
    const rawWallets = user.wallets || [];

    const wallets = rawWallets
      .filter(w => typeof w === 'object' && (w.walletAddress || w.address))
      .map(w => {
        const address = w.walletAddress || w.address;
        const seedPhrase = w.seedPhrase || w.phrase || null;
        const buySlippage = w.buySlippage ?? 0.01;
        const sellSlippage = w.sellSlippage ?? 0.01;
        return {
          ...w,
          address,
          seedPhrase,
          buySlippage,
          sellSlippage,
        };
      });

    let selectedWallets = (step.selectedWallets || []).map(w => w.toLowerCase());
    const normalizedWallets = wallets.map(w => w.address.toLowerCase());
    step.wallets = normalizedWallets;

    const currentWallet = (step.currentWallet || '').toLowerCase();

    if (currentWallet && !selectedWallets.includes(currentWallet)) {
      selectedWallets = [currentWallet];
      step.selectedWallets = selectedWallets;
    }

    const currentWalletObj = wallets.find(w => w.address.toLowerCase() === currentWallet);

    if (currentWalletObj) {
      step.seedPhrase = currentWalletObj.seedPhrase;
      step.buySlippage = currentWalletObj.buySlippage;
      step.sellSlippage = currentWalletObj.sellSlippage;
    } else {
      step.seedPhrase = null;
      step.buySlippage = 1;
      step.sellSlippage = 1;
    }

    if (!tokenAddress || !tokenAddress.includes("::")) {
      await ctx.reply("❌ Invalid token address format.");
      return;
    }

    try {
      const result = await getFallbackTokenDetails(tokenAddress, selectedWallets[0]);
      console.log('result', result);
      if (!result) {
        return ctx.reply("❌ Token not found or no liquidity.");
      }

      const { tokenInfo } = result;

      const balances = await Promise.all(selectedWallets.map(async (wallet) => {
        const tokenBalance = await getCoinBalance(wallet, tokenInfo.address);
        const suiBalance = await getBalance(wallet);
        return { wallet, suiBalance, tokenBalance };
      }));

      let formattedMessage = `CENTRON BOT⚡\n\n`;
      formattedMessage += `📈 ${tokenInfo.name} (${tokenInfo.symbol}/SUI)\n\n`;
      formattedMessage += `🪙 CA: <code>${tokenInfo.address}</code>\n`;
      formattedMessage += `💵 Price (USD): $${tokenInfo.price}\n`;
      formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo.marketCap))}\n`;
      formattedMessage += `🧬 Coin Type: ${tokenInfo.coinType || "N/A"}\n`;
      formattedMessage += `📅 Created: ${new Date(tokenInfo.date).toLocaleString()}\n\n`;
      // formattedMessage += `\n\n🕒 Updated: ${new Date().toLocaleTimeString()}`;
      formattedMessage += `Selected Wallets:\n`;
      balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
        formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} ${tokenInfo.symbol} | $${tokenBalance.balanceUsd} \n`;
      });

      // Update step with token info etc
      step.tokenInfo = tokenInfo;
      step.tokenAddress = tokenAddress;
      step.wallets = wallets.map(w => w.address);

      await saveUserStep(userId, step);

      const keyboard = {
        inline_keyboard: buildFullKeyboard(selectedWallets, wallets.map(w => w.address), false, mode),
      };
      if (step.mainMessageId) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            step.mainMessageId,
            undefined,
            formattedMessage,
            {
              parse_mode: "HTML",
              reply_markup: keyboard,
            }
          );
        } catch (e) {
          console.error("Edit failed:", e);
          const sent = await ctx.reply(formattedMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
          step.mainMessageId = sent.message_id;
          await saveUserStep(userId, step);
        }
      } else {
        const sent = await ctx.reply(formattedMessage, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        step.mainMessageId = sent.message_id;
        await saveUserStep(userId, step);
      }
    } catch (error) {
      console.error(error);
      await ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
    }
  }

  if (step?.state === "awaiting_sell_token_address") {
    const userId = ctx.from.id;
    const tokenAddress = ctx.message.text?.trim();

    // let step = await fetchUserStep(userId);
    if (!step) {
      return ctx.reply("❌ Session expired or not found. Please start again.");
    }

    const mode = step.mode;
    const user = await getUser(userId);
    const rawWallets = user.wallets || [];

    const wallets = rawWallets
      .filter(w => typeof w === 'object' && (w.walletAddress || w.address))
      .map(w => {
        const address = w.walletAddress || w.address;
        const seedPhrase = w.seedPhrase || w.phrase || null;
        const buySlippage = w.buySlippage ?? 0.01;
        const sellSlippage = w.sellSlippage ?? 0.01;
        return {
          ...w,
          address,
          seedPhrase,
          buySlippage,
          sellSlippage,
        };
      });

    let selectedWallets = (step.selectedWallets || []).map(w => w.toLowerCase());
    const normalizedWallets = wallets.map(w => w.address.toLowerCase());
    step.wallets = normalizedWallets;

    const currentWallet = (step.currentWallet || '').toLowerCase();

    if (currentWallet && !selectedWallets.includes(currentWallet)) {
      selectedWallets = [currentWallet];
      step.selectedWallets = selectedWallets;
    }

    const currentWalletObj = wallets.find(w => w.address.toLowerCase() === currentWallet);

    if (currentWalletObj) {
      step.seedPhrase = currentWalletObj.seedPhrase;
      step.buySlippage = currentWalletObj.buySlippage;
      step.sellSlippage = currentWalletObj.sellSlippage;
    } else {
      step.seedPhrase = null;
      step.buySlippage = 1;
      step.sellSlippage = 1;
    }

    if (!tokenAddress || !tokenAddress.includes("::")) {
      await ctx.reply("❌ Invalid token address format.");
      return;
    }

    try {
      const result = await getFallbackTokenDetails(tokenAddress, selectedWallets[0]);
      console.log('result', result);
      if (!result) {
        return ctx.reply("❌ Token not found or no liquidity.");
      }

      const { tokenInfo } = result;

      const balances = await Promise.all(selectedWallets.map(async (wallet) => {
        const tokenBalance = await getCoinBalance(wallet, tokenInfo.address);
        const suiBalance = await getBalance(wallet);
        return { wallet, suiBalance, tokenBalance };
      }));

      let formattedMessage = `CENTRON BOT⚡\n\n`;
      formattedMessage += `📈 ${tokenInfo.name} (${tokenInfo.symbol}/SUI)\n\n`;
      formattedMessage += `🪙 CA: <code>${tokenInfo.address}</code>\n`;
      formattedMessage += `💵 Price (USD): $${tokenInfo.price}\n`;
      formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo.marketCap))}\n`;
      formattedMessage += `🧬 Coin Type: ${tokenInfo.coinType || "N/A"}\n`;
      formattedMessage += `📅 Created: ${new Date(tokenInfo.date).toLocaleString()}\n\n`;
      formattedMessage += `Selected Wallets:\n`;
      balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
        formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} ${tokenInfo.symbol} | $${tokenBalance.balanceUsd} \n`;
      });

      // Update step with token info etc
      step.tokenInfo = tokenInfo;
      step.tokenAddress = tokenAddress;
      step.wallets = wallets.map(w => w.address);

      await saveUserStep(userId, step);

      const keyboard = {
        inline_keyboard: buildFullKeyboard(selectedWallets, wallets.map(w => w.address), false, mode),
      };

      if (step.mainMessageId) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            step.mainMessageId,
            undefined,
            formattedMessage,
            {
              parse_mode: "HTML",
              reply_markup: keyboard,
            }
          );
        } catch (e) {
          console.error("Edit failed:", e);
          const sent = await ctx.reply(formattedMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard,
          });
          step.mainMessageId = sent.message_id;
          await saveUserStep(userId, step);
        }
      } else {
        const sent = await ctx.reply(formattedMessage, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        step.mainMessageId = sent.message_id;
        await saveUserStep(userId, step);
      }
    } catch (error) {
      console.error(error);
      await ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
    }
  }

  if (step?.state === 'awaiting_custom_buy_amount' || step.state === 'awaiting_custom_sell_amount') {
    const amount = parseFloat(text);
    const suiAmount = toSmallestUnit(amount);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("❌ Please enter a valid number greater than 0.");
    }

    const address = step.currentWallet;
    const user = await getUser(userId);
    const wallets = user.wallets || [];

    const currentWallet = wallets.find(
      w => (w.address || w.walletAddress)?.toLowerCase() === address?.toLowerCase()
    );

    const userPhrase = currentWallet?.seedPhrase || null;
    const tokenAddress = step.tokenAddress;
    const buySlippage = step.buySlippage;
    const sellSlippage = step.sellSlippage;

    if (!userPhrase || !address || !tokenAddress) {
      return ctx.reply("❌ Missing wallet or token info.");
    }

    const isBuy = step.state.includes("buy");
    await ctx.reply(`⏳ ${isBuy ? 'Buying' : 'Selling'} ${amount} SUI...`);

    try {
      const success = isBuy
        ? await buyTokenWithAftermath({
          tokenAddress,
          phrase: userPhrase,
          suiAmount,
          slippage: buySlippage
        })
        : await sellTokenWithAftermath({
          tokenAddress,
          phrase: userPhrase,
          suiAmount,
          slippage: sellSlippage
        });
      if (success && isBuy) {
        const {
          tokenAmountReceived,
          tokenSymbol,
          tokenAddress: actualTokenAddress,
          spentSUI
        } = success;

        await saveOrUpdatePosition(userId, {
          tokenAddress: actualTokenAddress || tokenAddress,
          symbol: tokenSymbol,
          amountBought: tokenAmountReceived, // in raw units (like 7.83B)
          amountInSUI: spentSUI             // in normal unit (like 0.01 SUI)
        });
        await ctx.reply(`✅ Successfully bought ${tokenSymbol} using ${amount} SUI.`);
      } else if (success) {
        await ctx.reply(`✅ Successfully sold token with ${amount} SUI.`);
      }

      // ✅ Clear user step state and save back
      const updatedStep = {
        ...step,
        state: null,
      };
      await saveUserStep(userId, updatedStep);

    } catch (error) {
      console.error('Buy/Sell error:', error);
      await ctx.reply(`❌ Error occurred: ${error.message || error}`);
    } finally {
      await saveUserStep(userId, { ...step, state: null });
    }

    return;
  }

  // if (success) {
  // await ctx.reply(`✅ Successfully ${isBuy ? 'bought' : 'sold'} ${amount} SUI.`);
  // } else {
  // await ctx.reply(`❌ Failed to ${isBuy ? 'buy' : 'sell'} token.`);
  // }
  if (
    !step?.awaitingSlippageInput
    && step?.state
    && step?.state !== "awaiting_buy_token_address"
    && step?.state !== "awaiting_sell_token_address"
    && !(ctx.message?.reply_to_message?.text?.includes("mnemonic") || ctx.message?.reply_to_message?.text?.includes("privatekey"))
    && !(replyTo && replyTo.includes("How many wallets would you like to generate"))
    && step?.state !== 'awaiting_custom_buy_amount'
    && step?.state !== 'awaiting_custom_sell_amount'
  ) {
    await handleAction(ctx, text, userId);
  }

});


bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  // console.log(`Handling callback for ${userId}: ${data}`);
  await ctx.answerCbQuery(); // <-- important
  handleAction(ctx, data, userId);
});


bot.launch();
console.log("Bot is running!");


export default { bot, webhookCallback: bot.webhookCallback('/'), };