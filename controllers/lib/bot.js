import { Telegraf } from "telegraf";
import { session } from 'telegraf';
import { saveUser, getUser, fetchUser, deleteUser, addWalletToUser } from "./db.js";
import { getBalance } from "./getBalance.js";
import { generateWallet } from "./generateWallet.js";
import { importWalletFromInput } from "./importWallet.js";
import { handleAction } from "./handleAction.js";
import { mainMenu } from "./mainMenu.js";
import { handleWallets } from "./handleWallets.js";
import { generateNewWallet } from "./genNewWallet.js";
import { userSteps, userTemp } from "./userState.js";
import { formatPrice, getCoinBalance, getInsidexTokenDetails, getTokenDetails } from "../../utils/getTokenDetails.js";
import { handleBuySlippage, handleSellSlippage, updateAllBuyWalletsSlippage, updateAllSellWalletsSlippage } from "./buySlippage.js";
import { updateBuySlippage } from "./db.js";
import { updateSellSlippage } from "./db.js";
import { incrementReferrer } from "./db.js";
import { buyTokenWithAftermath, sellTokenWithAftermath } from "../aftermath/aftermath.js";
import { AggregatorClient } from "@cetusprotocol/aggregator-sdk"
import { toSmallestUnit } from "./suiAmount.js";


// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Telegraf('7280147356:AAEiEsTxsJU0M2qvOyiXJEGz1lhP-K67iMA');
bot.use(session());

const client = new AggregatorClient({})

// /start → Generate wallet + save to Firestore
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString() || 'unknown';
  const chatId = ctx.chat.id;

  if (!userId) {
    console.error("❌ userId is undefined. Cannot proceed.");
    return ctx.reply("Something went wrong. Please try again later.");
  }

  const payload = ctx.startPayload; // e.g., "ref_123456"
  const user = await getUser(userId, payload); // creates user if not exist

  if (payload) {
    await incrementReferrer(payload);
  }

  const referralLink = `https://t.me/${ctx.me}?start=ref_${userId}`;

  // ✅ Only generate wallet if this is the first time (no wallets yet)
  if (!user.wallets || user.wallets.length === 0) {
    const wallet = await generateWallet();
    await addWalletToUser(userId, wallet);

    try {
      await saveUser(userId, {
        walletAddress: wallet.walletAddress,
        seedPhrase: wallet.seedPhrase,
        privateKey: wallet.privateKey,
        createdAt: new Date().toISOString()
      });
      console.log("✅ Wallet generated and user saved in Firestore");

      await ctx.replyWithHTML(`
        🚀 <b>Wallet Generated!</b>  
        📌 <b>Address:</b> <code>${wallet.walletAddress}</code>  
        📌 <b>Seed Phrase:</b> <code>${wallet.seedPhrase}</code>  
        🔐 <b>Private Key:</b> <code>${wallet.privateKey}</code>  

        ⚠️ <i>Save your private key securely!</i>  
      `);
    } catch (err) {
      console.error("🔥 Failed to save wallet in Firestore:", err);
      return ctx.reply("Failed to create your wallet. Try again.");
    }
  } else {
    await ctx.replyWithHTML(`
        Welcome to <b>Centron Bot</b>

      Trade tokens on SUI with the fastest trading bot. <b>All DEXes + MovePump</b> are supported.

      🔽 Invite friends and <b>earn up to 35% of their trading fees</b> with our 5-layered referral system!
      <code>${referralLink}</code>
      `, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📸 QR Code", callback_data: "show_qr" },
            { text: "❌ Close", callback_data: "close" }
          ]
        ]
      }
    }
    );
  }

  await ctx.reply("Press 'Continue' to proceed:", {
    reply_markup: {
      keyboard: [[{ text: "➡️ Continue" }]],
      resize_keyboard: true,
    },
  });
});

// ➡️ Continue handler (you can show the menu here)
bot.hears("➡️ Continue", async (ctx) => {
  const userId = ctx.from.id;
  const user = await fetchUser(userId);
  // console.log(user);

  if (!user || !user.walletAddress) {
    return ctx.reply("❌ Wallet not found. Use /start to generate one.");
  }

  await ctx.reply(".", {
    reply_markup: {
      remove_keyboard: true,
    },
  });

  await ctx.reply(`👋 *Welcome to Centron Bot*\n
    Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.\n
  ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`, {
    parse_mode: "Markdown",
    ...mainMenu,
  });
});

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

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


export function buildFullKeyboard(selectedWallets, allWallets, showAll = false, mode = "buy") {
  console.log("buildFullKeyboard called with mode:", mode);
  const selectedLower = selectedWallets
    .map(a => (typeof a === 'string' ? a.toLowerCase() : ''))
    .filter(Boolean);

  const allLower = allWallets
    .map(w => (typeof w === 'string' ? w.toLowerCase() : ''))
    .filter(Boolean);

  const walletsToShow = showAll ? allLower : allLower.slice(0, 4); // Show first 4 if not toggled

  const rows = [];

  rows.push([
    { text: showAll ? "All Wallets" : "💳 Wallets 💳", callback_data: "toggle_all_wallets" }
  ]);

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

  rows.push([
    { text: "Buy ↔ Sell", callback_data: "toggle_mode" },
  ]);

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
  } else if (mode === "sell") {
    rows.push([
      { text: `${prefixIcon} Sell 25%`, callback_data: `${action}_25` },
      { text: `${prefixIcon} Sell 50%`, callback_data: `${action}_50` }
    ]);
    rows.push([
      { text: `${prefixIcon} Sell 100%`, callback_data: `${action}_100` }
    ]);
  }

  rows.push([
    { text: "❌ Cancel", callback_data: "cancel_to_main" },
    { text: "🔄 Refresh", callback_data: "refresh_info" }
  ]);

  return rows;
}

export async function renderMainMessage(ctx, userId) {
  const step = userSteps[userId];
  const selectedWallets = step.selectedWallets || [];
  const tokenInfo = step.tokenInfo;
  const tokenName = tokenInfo.name;
  const tokenSymbol = tokenInfo.symbol;
  // const quoteSymbol = tokenInfo?.data?.quoteToken?.symbol;
  const token_address = tokenInfo.address;
  // const isSuiPair = quoteSymbol === "SUI";

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


bot.use(async (ctx, next) => {
  if (ctx.message?.text?.startsWith("/")) {
    const userId = ctx.from.id;
    if (!userSteps[userId]) userSteps[userId] = {};
    userSteps[userId].state = null; // Reset state on any command
  }
  await next();
});


// bot.command("config", async (ctx) => {
//   const configMenu = {
//     parse_mode: "Markdown",
//     reply_markup: {
//       inline_keyboard: [
//         [
//           { text: "✏️ Buy Slippage", callback_data: "buy_slippage" },
//           { text: "✏️ Sell Slippage", callback_data: "sell_slippage" }
//         ],
//         [
//           { text: "← Back", callback_data: "back_to_menu" }
//         ]
//       ]
//     }
//   };

//   try {
//     // Either send new message or edit existing message if possible
//     await ctx.reply("📍 *Settings*", configMenu);
//   } catch (err) {
//     console.error("Failed to send /config menu:", err);
//   }
// });


bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const text = ctx.message.text?.trim();
  const replyTo = ctx.message?.reply_to_message?.text;
  const step = userSteps[userId];
  const user = await fetchUser(userId);

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
      return ctx.reply("❌ Invalid slippage. Please enter a number between 0.1 and 50.");
    }

    try {
      if (step.scope === "all" && step.type === "buy") {
        await updateAllBuyWalletsSlippage(userToString, slippage);
        await ctx.reply(`✅ Buy slippage updated to ${slippage}% for all wallets`);
        await handleBuySlippage(ctx, userId);
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

      delete userSteps[userId]; // Clean up
      return;
    } catch (err) {
      console.error(err);
      return ctx.reply("❌ Failed to update slippage.");
    }
  }

  // buy token
  if (step?.state === "awaiting_buy_token_address") {
    const tokenAddress = ctx.message.text?.trim();
    // userSteps[userId].mode = userSteps[userId].mode === "buy" ? "sell" : "buy";
    const mode = userSteps[userId].mode;
    const user = await getUser(userId);
    const rawWallets = user.wallets || [];
    const wallets = rawWallets
      .filter(w => typeof w === 'object' && (w.walletAddress || w.address)) // Only valid objects
      .map(w => {
        const address = w.walletAddress || w.address;
        const seedPhrase = w.seedPhrase || w.phrase || null; // normalize phrase key
        const buySlippage = w.buySlippage;   // default to 15 if missing
        const sellSlippage = w.sellSlippage; // default to 20 if missing
        return {
          ...w,
          address, // normalize it
          seedPhrase,
          buySlippage,
          sellSlippage
        };
      });
    // console.log('wallets', wallets);
    let selectedWallets = (userSteps[userId]?.selectedWallets || []).map(w => w.toLowerCase());
    const normalizedWallets = wallets.map(w => (w.address || w.walletAddress).toLowerCase());
    userSteps[userId].wallets = normalizedWallets;
    const currentWallet = (userSteps[userId]?.currentWallet || '').toLowerCase();
    // console.log('current wallet', currentWallet);

    // Default selection
    if (currentWallet && !selectedWallets.includes(currentWallet)) {
      selectedWallets = [currentWallet];
      userSteps[userId].selectedWallets = selectedWallets;
    }

    // Find the current wallet object from wallets
    const currentWalletObj = wallets.find(w => (w.address || w.walletAddress).toLowerCase() === currentWallet);
    // Save the normalized seed phrase into userSteps
    if (currentWalletObj) {
      userSteps[userId].seedPhrase = currentWalletObj.seedPhrase || currentWalletObj.phrase || null;
      userSteps[userId].buySlippage = currentWalletObj.buySlippage;  // default 15
      userSteps[userId].sellSlippage = currentWalletObj.sellSlippage; // default 20
    } else {
      userSteps[userId].seedPhrase = null; // or keep previous, your choice
      userSteps[userId].buySlippage = 0.01;
      userSteps[userId].sellSlippage = 0.01;
    }
    // console.log('selectedWallets before formatting:', selectedWallets);
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

      const { tokenInfo, source } = result;
      // const isSuiPair = tokenInfo.data.quoteToken.symbol === "SUI";
      // const isSuiPair = tokenInfo.decimals === "SUI";

      const balances = await Promise.all(selectedWallets.map(async (wallet) => {
        const tokenBalance = await getCoinBalance(wallet, tokenInfo.address);
        const suiBalance = await getBalance(wallet);
        return { wallet, suiBalance, tokenBalance };
      }));

      // const quoteSymbol = tokenInfo?.symbol;
      const tokenName = tokenInfo.name;
      const tokenSymbol = tokenInfo.symbol;
      const token_address = tokenInfo.address;
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
      // let tokenBalance = { balance: 0, balanceUsd: 0 };
      // let suiBalance = 0;

      if (!userSteps[userId]) userSteps[userId] = {};
      userSteps[userId].tokenInfo = tokenInfo;
      userSteps[userId].tokenAddress = tokenAddress;
      userSteps[userId].wallets = wallets.map(w => w.address);
      // Also save phrase here if you want
      // const currentWalletObj = wallets.find(w => (w.address || w.walletAddress).toLowerCase() === (userSteps[userId]?.currentWallet || '').toLowerCase());
      // userSteps[userId].seedPhrase = currentWalletObj?.seedPhrase || currentWalletObj?.phrase || null;

       const keyboard = {
        inline_keyboard: buildFullKeyboard(selectedWallets, wallets.map(w => w.address), false, mode)
      };

      if (userSteps[userId]?.mainMessageId) {
        // Try editing the existing main message
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            userSteps[userId].mainMessageId,
            undefined,
            formattedMessage,
            {
              parse_mode: "HTML",
              reply_markup: keyboard
            }
          );
        } catch (err) {
          console.warn("editMessageText failed, sending new message instead");
          const sent = await ctx.reply(formattedMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard
          });
          userSteps[userId].mainMessageId = sent.message_id;
        }
      } else {
        // First time showing main message
        const sent = await ctx.reply(formattedMessage, {
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        userSteps[userId].mainMessageId = sent.message_id;
      }

    } catch (error) {
      console.error(error);
      ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
    }
  }

  //sell token
  if (step?.state === "awaiting_sell_token_address") {
    const tokenAddress = ctx.message.text?.trim();
    // userSteps[userId].mode = userSteps[userId].mode === "sell" ? "buy" : "sell";
    const mode = userSteps[userId].mode;
    console.log('modeeeee', mode);
    console.log("what is happening", userSteps[userId])
    const user = await getUser(userId);
    const rawWallets = user.wallets || [];
    const wallets = rawWallets
      .filter(w => typeof w === 'object' && (w.walletAddress || w.address)) // Only valid objects
      .map(w => {
        const address = w.walletAddress || w.address;
        const seedPhrase = w.seedPhrase || w.phrase || null; // normalize phrase key
        const buySlippage = w.buySlippage;   // default to 15 if missing
        const sellSlippage = w.sellSlippage; // default to 20 if missing
        return {
          ...w,
          address, // normalize it
          seedPhrase,
          buySlippage,
          sellSlippage
        };
      });
    // console.log('wallets', wallets);
    let selectedWallets = (userSteps[userId]?.selectedWallets || []).map(w => w.toLowerCase());
    const normalizedWallets = wallets.map(w => (w.address || w.walletAddress).toLowerCase());
    userSteps[userId].wallets = normalizedWallets;
    const currentWallet = (userSteps[userId]?.currentWallet || '').toLowerCase();
    // console.log('current wallet', currentWallet);

    // Default selection
    if (currentWallet && !selectedWallets.includes(currentWallet)) {
      selectedWallets = [currentWallet];
      userSteps[userId].selectedWallets = selectedWallets;
    }

    // Find the current wallet object from wallets
    const currentWalletObj = wallets.find(w => (w.address || w.walletAddress).toLowerCase() === currentWallet);
    // Save the normalized seed phrase into userSteps
    if (currentWalletObj) {
      userSteps[userId].seedPhrase = currentWalletObj.seedPhrase || currentWalletObj.phrase || null;
      userSteps[userId].buySlippage = currentWalletObj.buySlippage;  // default 15
      userSteps[userId].sellSlippage = currentWalletObj.sellSlippage; // default 20
    } else {
      userSteps[userId].seedPhrase = null; // or keep previous, your choice
      userSteps[userId].buySlippage = 0.01;
      userSteps[userId].sellSlippage = 0.01;
    }
    // console.log('selectedWallets before formatting:', selectedWallets);
    if (!tokenAddress || !tokenAddress.includes("::")) {
      await ctx.reply("❌ Invalid token address format.");
      return;
    }
    try {
      const result = await getFallbackTokenDetails(tokenAddress, selectedWallets[0]);
      // console.log('result', result);
      if (!result) {
        return ctx.reply("❌ Token not found or no liquidity.");
      }

      const { tokenInfo, source } = result;
      // const isSuiPair = tokenInfo.data.quoteToken.symbol === "SUI";
      // const isSuiPair = tokenInfo.decimals === "SUI";

      const balances = await Promise.all(selectedWallets.map(async (wallet) => {
        const tokenBalance = await getCoinBalance(wallet, tokenInfo.address);
        const suiBalance = await getBalance(wallet);
        return { wallet, suiBalance, tokenBalance };
      }));

      // const quoteSymbol = tokenInfo?.symbol;
      const tokenName = tokenInfo.name;
      const tokenSymbol = tokenInfo.symbol;
      const token_address = tokenInfo.address;
      let formattedMessage = `CENTRON BOT⚡\n\n`;
      formattedMessage += `📉${tokenName} (${tokenSymbol}/SUI)\n\n`;
      formattedMessage += `🪙 CA: <code>${token_address}</code>\n`;
      formattedMessage += `💵 Price (USD): $${tokenInfo.price}\n`;
      formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo.marketCap))}\n`;
      formattedMessage += `🧬 Coin Type: ${tokenInfo.coinType || "N/A"}\n`;
      formattedMessage += `📅 Created: ${new Date(tokenInfo.date).toLocaleString()}\n\n`;
      formattedMessage += `Selected Wallets:\n`;
      balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
        formattedMessage += ` 💳 ${shortAddress(wallet)} | ${suiBalance} SUI | ${tokenBalance.balance} ${tokenSymbol} | $${tokenBalance.balanceUsd} \n`;
      });
      // let tokenBalance = { balance: 0, balanceUsd: 0 };
      // let suiBalance = 0;

      if (!userSteps[userId]) userSteps[userId] = {};
      userSteps[userId].tokenInfo = tokenInfo;
      userSteps[userId].tokenAddress = tokenAddress;
      userSteps[userId].wallets = wallets.map(w => w.address);
      console.log("what is happening", userSteps[userId])

      // Also save phrase here if you want
      // const currentWalletObj = wallets.find(w => (w.address || w.walletAddress).toLowerCase() === (userSteps[userId]?.currentWallet || '').toLowerCase());
      // userSteps[userId].seedPhrase = currentWalletObj?.seedPhrase || currentWalletObj?.phrase || null;

      const keyboard = {
        inline_keyboard: buildFullKeyboard(selectedWallets, wallets.map(w => w.address), false, mode)
      };

      if (userSteps[userId]?.mainMessageId) {
        // Try editing the existing main message
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            userSteps[userId].mainMessageId,
            undefined,
            formattedMessage,
            {
              parse_mode: "HTML",
              reply_markup: keyboard
            }
          );
        } catch (err) {
          console.warn("editMessageText failed, sending new message instead");
          const sent = await ctx.reply(formattedMessage, {
            parse_mode: "HTML",
            reply_markup: keyboard
          });
          userSteps[userId].mainMessageId = sent.message_id;
        }
      } else {
        // First time showing main message
        const sent = await ctx.reply(formattedMessage, {
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        userSteps[userId].mainMessageId = sent.message_id;
      }

    } catch (error) {
      console.error(error);
      ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
    }
  }


  if (step.state === 'awaiting_custom_buy_amount' || step.state === 'awaiting_custom_sell_amount') {
    const amount = parseFloat(text);
    const suiAmount = toSmallestUnit(amount)
    console.log("My amount", suiAmount);

    if (isNaN(amount) || amount <= 0) {
      return ctx.reply("❌ Please enter a valid number greater than 0.");
    }

    const address = step.currentWallet;
    const user = await getUser(userId);
    const wallets = user.wallets || [];

    // Find the actual wallet object for the current wallet
    const currentWallet = wallets.find(
      w => (w.address || w.walletAddress)?.toLowerCase() === address?.toLowerCase()
    );

    const userPhrase = currentWallet?.seedPhrase || null;
    const tokenAddress = step.tokenAddress;
    const buySlippage = step.buySlippage;
    const sellSlippage = step.sellSlippage;

    console.log('heyyyy', address, userPhrase, tokenAddress);
    // const phrase = user?.seedPhrase;
    // const address = user?.walletAddress || step.currentWallet;
    if (!userPhrase || !address || !tokenAddress) {
      return ctx.reply("❌ Missing wallet or token info.");
    }

    await ctx.reply(`⏳ ${step.state.includes('buy') ? 'Buying' : 'Selling'} ${amount} SUI...`);
    try {
      const success = step.state.includes('buy')
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

      if (success) {
        await ctx.reply(`✅ Successfully ${step.state.includes('buy') ? 'bought' : 'sold'} ${amount} SUI.`);
      } else {
        await ctx.reply(`❌ Failed to ${step.state.includes('buy') ? 'buy' : 'sell'} token.`);
      }
      delete userSteps[userId].state;
    } catch (error) {
      console.error('Buy/Sell error:', error);
      await ctx.reply(`❌ Error occurred: ${error.message || error}`);
    }

    // Reset user state
    delete userSteps[userId];
  }

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
  await ctx.answerCbQuery(); // <-- important
  handleAction(ctx, data, userId);
});


bot.launch();
console.log("Bot is running!");


export default { bot, webhookCallback: bot.webhookCallback('/'), };