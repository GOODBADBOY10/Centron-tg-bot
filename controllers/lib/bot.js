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
import { formatPrice, getCoinBalance, getTokenDetails } from "../../utils/getTokenDetails.js";
import { getTokenDetailsCetus } from "./buyToken.js";
import { handleBuySlippage, handleSellSlippage, updateAllBuyWalletsSlippage, updateAllSellWalletsSlippage } from "./buySlippage.js";
import { updateBuySlippage } from "./db.js";
import { updateSellSlippage } from "./db.js";
import { buyTokenSui } from "../aggregators/aggregator.js";
import { incrementReferrer } from "./db.js";

// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Telegraf('7280147356:AAEiEsTxsJU0M2qvOyiXJEGz1lhP-K67iMA');
bot.use(session());


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
    ⬇️ *Your Wallet Address (Click to Copy)*\n\`${user.walletAddress}\`\n
  ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`, {
    parse_mode: "Markdown",
    ...mainMenu,
  });

  // await ctx.deleteMessage();
});

async function getFallbackTokenDetails(tokenAddress, walletAddress) {
  try {
    const tokenInfo = await getTokenDetailsCetus(tokenAddress);
    if (tokenInfo?.data) {
      console.log('Token info from Cetus:', tokenInfo.data, tokenInfo);
      return { tokenInfo, source: 'cetus' };
    }
  } catch (err) {
    console.log('Cetus failed:', err.message || err);
  }

  try {
    const tokenInfo = await getTokenDetails(tokenAddress, walletAddress);
    if (tokenInfo?.data?.baseToken?.name) {
      console.log('Token info from fallback:', tokenInfo.data);
      return { tokenInfo, source: 'fallback' };
    }
  } catch (err) {
    console.log('Fallback failed:', err.message || err);
  }

  return null;
}

function getReferralCode(userId) {
  return `ref_${Buffer.from(userId.toString()).toString('base64').slice(0, 6)}`;
}

function buildFullKeyboard(selectedWallets, allWallets) {
  const walletButtons = allWallets.map(w => {
    const isSelected = selectedWallets.includes(w.address);
    return [{
      text: `${isSelected ? '🟢' : '⚪'} ${shortAddress(w.address)}`,
      callback_data: `toggle_wallet_${w.address}`
    }];
  });

  const buyButtons = [
    [{ text: 'Buy 10 SUI', callback_data: 'buy_10' }, { text: 'Buy 50 SUI', callback_data: 'buy_50' }],
    [{ text: 'Buy 100 SUI', callback_data: 'buy_100' }, { text: 'Buy 500 SUI', callback_data: 'buy_500' }],
    [{ text: 'Buy 1000 SUI', callback_data: 'buy_1000' }],
    [{ text: 'Buy Custom SUI', callback_data: 'buy_custom' }]
  ];

  return [...walletButtons, ...buyButtons];
}


bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const text = ctx.message.text?.trim();
  const replyTo = ctx.message?.reply_to_message?.text;
  const step = userSteps[userId];
  const user = await fetchUser(userId);
  // const slippage = parseFloat(ctx.message.text);

  // first reply
  if (ctx.message.text) {
    const text = ctx.message.text;
    handleAction(ctx, text);
  }

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
        ...(imported.phrase ? { phrase: imported.phrase } : {}),
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
      if (step === "awaiting_buy_slippage_all") {
        await updateAllBuyWalletsSlippage(userToString, slippage);
        await ctx.reply(`✅ Buy slippage updated to ${slippage}% for all wallets`);
        await handleBuySlippage(ctx, userId);
      } else if (step === "awaiting_sell_slippage_all") {
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
    const user = await getUser(userId);
    const wallets = user.wallets || []
    const userStep = userSteps[userId] || {};
    console.log('steps', userStep)
    const selectedWallets = userStep.selectedWallets || [];
    console.log('selected-wallets', selectedWallets);
    if (!tokenAddress || !tokenAddress.includes("::")) {
      return ctx.reply("❌ Invalid token address format.");
    }

    if (!selectedWallets.length) {
      return ctx.reply("❌ Please select at least one wallet.");
    }

    try {
      const previewWallet = selectedWallets[0]?.address;
      const result = await getFallbackTokenDetails(tokenAddress, previewWallet);
      // const result = await getFallbackTokenDetails(tokenAddress, walletAddress);
      console.log(result);
      if (!result) {
        return ctx.reply("❌ Token not found or no liquidity.");
      }
      const { tokenInfo, source } = result;
      // let tokenBalance = { balance: 0, balanceUsd: 0 };
      // let suiBalance = 0;
      const isSuiPair = tokenInfo.data.quoteToken.symbol === "SUI";

      const balances = await Promise.all(selectedWallets.map(async (wallet) => {
        const tokenBalance = isSuiPair
          ? await getCoinBalance(wallet, tokenInfo.data.baseToken.address)
          : { balance: 0, balanceUsd: 0 };
        const suiBalance = await getBalance(wallet);

        return {
          wallet,
          suiBalance,
          tokenBalance
        };
      }));


      // if (isSuiPair) {
      //   // Fetch token balance
      //   token_balance = await getCoinBalance(walletAddress, tokenInfo.data.baseToken.address);
      //   suiBalance = await getBalance(walletAddress);
      //   // const suiBalance = 0;
      //   const args = {
      //     token_balance: token_balance,
      //     token_name: tokenInfo?.data?.baseToken?.name,
      //     token_symbol: tokenInfo?.data?.baseToken?.symbol,
      //     chart: tokenInfo?.data?.url,
      //     scan: `https://suiscan.xyz/mainnet/coin/${tokenInfo?.data.baseToken.address}/txs`,
      //     ca: tokenInfo?.data?.baseToken?.address,
      //   }
      // }

      userSteps[userId] = {
        state: null,
        tokenInfo,
        selectedWallets,
        wallets: user.wallets.map(w => w.address),
      };

      //   const formattedString = `
      //       <code>CENTRON BOT⚡<code>

      //  📈 ${tokenInfo?.data.baseToken.name}
      //  ${tokenInfo?.data.baseToken.symbol} / ${tokenInfo?.data.quoteToken.symbol}

      //  🪙 CA: ${tokenInfo?.data.baseToken.address}
      // 🔄 LP: ${tokenInfo?.data.dexId}

      // 💵 Price (USD): $${tokenInfo?.data.priceUsd}
      // 💱 Price : ${tokenInfo?.data.priceNative} ${tokenInfo?.data.quoteToken.symbol}

      // 💧 Liquidity (USD): ${formatPrice(Number(tokenInfo?.data.liquidity.usd))}

      // Selected wallets:
      // ${selectedWallets.length === 0 ? 'None selected' : selectedWallets.map(w => `🟢 ${shortAddress(w)}`).join('\n')}

      // 📊 FDV: ${formatPrice(Number(tokenInfo?.data.fdv))}
      // 🏦 Market Cap: ${formatPrice(Number(tokenInfo?.data.marketCap))}

      // 📅 Created: ${new Date(tokenInfo?.data.pairCreatedAt).toLocaleString()}
      // ----------------------------------------------------------------
      // 📬 Wallet Address: \`${walletAddress}\`
      // 💰 Balance: ${suiBalance} SUI💧
      // 💰 Balance: ${token_balance.balance} ${tokenInfo?.data.baseToken.symbol} | $${token_balance.balanceUsd}
      // `;

      const tokenName = tokenInfo?.data.baseToken.name;
      const tokenSymbol = tokenInfo?.data.baseToken.symbol;
      const quoteSymbol = tokenInfo?.data.quoteToken.symbol;
      const formattedLiquidity = formatPrice(Number(tokenInfo?.data.liquidity.usd));

      let formattedMessage = `<code>CENTRON BOT⚡</code>\n\n`;
      formattedMessage += `📈 ${tokenName} (${tokenSymbol}/${quoteSymbol})\n\n`;
      formattedMessage += `🪙 CA: ${tokenInfo?.data.baseToken.address}\n`;
      formattedMessage += `🔄 LP: ${tokenInfo?.data.dexId}\n\n`;
      formattedMessage += `💵 Price (USD): $${tokenInfo?.data.priceUsd}\n`;
      formattedMessage += `💱 Price: ${tokenInfo?.data.priceNative} ${quoteSymbol}\n`;
      formattedMessage += `💧 Liquidity (USD): ${formattedLiquidity}\n\n`;

      formattedMessage += `📊 FDV: ${formatPrice(Number(tokenInfo?.data.fdv))}\n`;
      formattedMessage += `🏦 Market Cap: ${formatPrice(Number(tokenInfo?.data.marketCap))}\n`;
      formattedMessage += `📅 Created: ${new Date(tokenInfo?.data.pairCreatedAt).toLocaleString()}\n\n`;

      formattedMessage += `Selected Wallets:\n`;
      balances.forEach(({ wallet, suiBalance, tokenBalance }) => {
        formattedMessage += `🟢 \`${wallet}\`\n`;
        formattedMessage += `   🔹 SUI: ${suiBalance} 💧\n`;
        formattedMessage += `   🔸 ${tokenSymbol}: ${tokenBalance.balance} | $${tokenBalance.balanceUsd}\n\n`;
      });

      await ctx.reply(formattedMessage, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buildFullKeyboard(selectedWallets, user.wallets)
        }
      })


    } catch (error) {
      console.error(error);
      ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
    }
  }

});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  handleAction(ctx, data, userId);
});


bot.launch();
console.log("Bot is running!");


export default { bot, webhookCallback: bot.webhookCallback('/'), };

