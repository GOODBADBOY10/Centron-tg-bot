import { Telegraf } from "telegraf";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { message } from "telegraf/filters";
import { saveUser, getUser, fetchUser, deleteUser, addWalletToUser } from "./db.js";
import { getBalance } from "./getBalance.js";
import { generateWallet } from "./generateWallet.js";
import { importWalletFromInput } from "./importWallet.js";
import { handleAction } from "./handleAction.js";
import { mainMenu } from "./mainMenu.js";
import { handleWallets } from "./handleWallets.js";
import { generateNewWallet } from "./genNewWallet.js";
// import { extractSymbolFromType, fetchTokenInfoFromCetus, getFullCoinType, getWalletWithTokenBalance, shorten } from "./buyToken.js";
import { userSteps, userTemp } from "./userState.js";

// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Telegraf('7280147356:AAEiEsTxsJU0M2qvOyiXJEGz1lhP-K67iMA');


// /start → Generate wallet + save to Firestore
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString() || 'unknown';
  const chatId = ctx.chat.id;
  // console.log("Start triggered. User ID:", userId);
  if (!userId) {
    console.error("❌ userId is undefined. Cannot proceed.");
    return ctx.reply("Something went wrong. Please try again later.");
  }
  const user = await getUser(userId, chatId);
  // console.log(user);
  const wallet = await generateWallet();
  // console.log(wallet);
  await addWalletToUser(userId.toString(), wallet);

  try {
    await saveUser(userId, {
      walletAddress: wallet.walletAddress,
      seedPhrase: wallet.seedPhrase,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString()
    });
    console.log("✅ User saved in Firestore");
  } catch (err) {
    console.error("🔥 Failed to save user in Firestore:", err);
    return ctx.reply("Failed to create your wallet. Try again.");
  }
  await ctx.replyWithHTML(`
🚀 <b>Wallet Generated!</b>  
📌 <b>Address:</b> <code>${wallet.walletAddress}</code>  
📌 <b>Seed Phrase:</b> <code>${wallet.seedPhrase}</code>  
🔐 <b>Private Key:</b> <code>${wallet.privateKey}</code>  

⚠️ <i>Save your private key securely!</i>  
  `);

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

bot.on("message", async (ctx, next) => {
  const userId = ctx.from.id;
  const text = ctx.message.text?.trim();
  const replyTo = ctx.message?.reply_to_message?.text;
  const user = await fetchUser(userId);
  // const slippage = parseFloat(ctx.message.text);
  // const walletAddress = ctx.session.settingSlippageFor;

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
      const { walletAddress, privateKey } = await generateNewWallet(userId.toString());

      await ctx.reply(
        `🎉 Wallet #${i + 1}\n📌 Address: \`${walletAddress}\`\n🔐 Private Key: \`${privateKey}\``,
        { parse_mode: "Markdown" }
      );
    }

    await ctx.reply("✅ All wallets generated!");
  }

  //slippage
  if (ctx.session?.settingSlippageFor) {
    const slippage = parseFloat(text);
    const walletAddress = ctx.session.settingSlippageFor;
    if (isNaN(slippage) || slippage < 0 || slippage > 100) {
      return ctx.reply("❌ Invalid slippage. Please enter a percentage between 0 and 100.");
    }
    if (walletAddress === "all") {
      const user = await fetchUser(userId);
      const updatePromises = user.wallets.map(wallet =>
        updateBuySlippage(userId, wallet.walletAddress, slippage)
      );
      await Promise.all(updatePromises);
      ctx.reply(`✅ Buy slippage updated to ${slippage}% for all wallets.`);
    } else {
      await updateBuySlippage(userId, walletAddress, slippage);
      ctx.reply(`✅ Buy slippage updated to ${slippage}% for wallet ${walletAddress}.`);
    }
    ctx.session.settingSlippageFor = null;
    return;
  }

  //buy token
  const session = userSteps[userId];
  await fetchUser(userId);

  // if (session?.state === "awaiting_token_address") {
  //   const tokenObjectId = ctx.message.text.trim();
  //   userSessions[userId] = null;

  //   const fullCoinType = await getFullCoinType(tokenObjectId);
  //   if (!fullCoinType) return ctx.reply("❌ Couldn't detect full token type from this object ID.");

  //   const tokenInfo = await fetchTokenInfoFromCetus(tokenObjectId);
  //   if (!tokenInfo) return ctx.reply("❌ Failed to fetch token info from Cetus.");

  //   const balances = await getWalletWithTokenBalance(user.walletAddress, fullCoinType);
  //   const tokenSymbol = extractSymbolFromType(fullCoinType);

  //   const message = `🟢 <b>${tokenInfo.name} - $${tokenInfo.symbol}</b>\n\n` +
  //     `CA - <code>${tokenObjectId}</code>\n\n` +
  //     `💰 Price: $${tokenInfo.price}\n` +
  //     `📊 Market Cap: $${tokenInfo.marketCap}\n` +
  //     `🔗 Bonding: ${tokenInfo.bonding}% (${tokenInfo.bondedAmount}/${tokenInfo.targetAmount} SUI)\n\n` +
  //     `👛 <b>Wallet:</b>\n` +
  //     `• <code>${shorten(user.walletAddress)}</code> | ${balances.sui} SUI | ${balances.token} ${tokenSymbol}`;

  //   await ctx.reply(message, {
  //     parse_mode: "HTML",
  //     reply_markup: {
  //       inline_keyboard: [
  //         [
  //           { text: "SuiScan", url: `https://suivision.xyz/token/${tokenObjectId}` },
  //           { text: "MovePump", url: "https://movepump.xyz" },
  //         ],
  //         [
  //           { text: "➕ Limit Order", callback_data: "limit_order" },
  //           { text: "📈 DCA Order", callback_data: "dca_order" },
  //         ],
  //         [{ text: "⚙️ Manage Orders", callback_data: "manage_orders" }],
  //         [{ text: "Buy ⬇️ Sell", callback_data: "buy_sell_toggle" }],
  //         [
  //           { text: "Buy 10 SUI", callback_data: `buy_10` },
  //           { text: "Buy 50 SUI", callback_data: `buy_50` },
  //         ],
  //         [
  //           { text: "Buy 100 SUI", callback_data: `buy_100` },
  //           { text: "Buy 200 SUI", callback_data: `buy_200` },
  //         ],
  //       ],
  //     },
  //   });
  // }

  //withdraw token
  // switch (session?.state) {
  //   case "awaiting_withdraw_amount": {
  //     const amount = parseFloat(replyTo);
  //     if (isNaN(amount) || amount <= 0) {
  //       return ctx.reply("❌ Invalid amount. Please enter a valid number.");
  //     }

  //     session.amount = amount;
  //     session.state = "awaiting_withdraw_address";
  //     return ctx.reply("📬 Now enter the recipient address to send the SUI to:");
  //   }

  //   case "awaiting_withdraw_address": {
  //     const address = ctx.message.text.trim();
  //     if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
  //       return ctx.reply("❌ Invalid address. Please enter a valid SUI address.", {
  //         parse_mode: "Markdown",
  //         reply_markup: {
  //             force_reply: true,
  //         },
  //     });
  //     }

  //     const user = await fetchUser(userId);
  //     const selectedWallet = user.wallets[session.selectedWalletIndex];

  //     if (!selectedWallet) {
  //       return ctx.reply("⚠️ Selected wallet not found.");
  //     }

  //     try {
  //       const txHash = await sendSui(selectedWallet.privateKey, address, session.amount);

  //       userSteps[userId] = null; // Clear session

  //       return ctx.reply(
  //         `✅ Successfully sent ${session.amount} SUI to ${shorten(address)}\n\n🔗 <a href="https://suivision.xyz/txblock/${txHash}">View on Explorer</a>`,
  //         { parse_mode: "HTML" }
  //       );
  //     } catch (err) {
  //       console.error("Withdraw SUI error:", err);
  //       return ctx.reply("❌ Transaction failed. Please try again.");
  //     }
  //   }

  //   default:
  //     break;
  // }

})


bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  handleAction(ctx, data);
});




//slipage
bot.action(/set_slippage_(.+)/, async (ctx) => {
  const userId = ctx.from.id.toString();
  const walletAddress = ctx.match[1];

  // Show input prompt for slippage (you can also use forcedReply or custom inline flow)
  ctx.session.settingSlippageFor = walletAddress;  // you may need session middleware
  return ctx.reply(`✏️ Enter the slippage percentage you want to set for ${walletAddress === "all" ? "all wallets" : walletAddress}`);
});

// Slippage settings
// bot.hears("⚙️ Slippage", (ctx) => {
//   ctx.reply("Set slippage:", {
//     reply_markup: {
//       inline_keyboard: [
//         [{ text: "1%", callback_data: "slippage_1" }],
//         [{ text: "3%", callback_data: "slippage_3" }],
//         [{ text: "5%", callback_data: "slippage_5" }],
//       ],
//     },
//   });
// });

// Save slippage to Firestore
// bot.action(/slippage_(\d+)/, async (ctx) => {
//   const userId = ctx.from.id;
//   const slippage = parseInt(ctx.match[1]);

//   // await saveUser(userId, {
//   // slippage,
//   // walletAddress: "",
//   // privateKey: ""
//   // });
//   ctx.reply(`✅ Slippage set to ${slippage}%`);
// });


bot.launch();
console.log("Bot is running!");


export default { bot, webhookCallback: bot.webhookCallback('/'), };