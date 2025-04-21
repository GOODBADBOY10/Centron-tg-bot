import { Telegraf } from "telegraf";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { message } from "telegraf/filters";
// import { saveUser, getUser, deleteUser } from "./db.js";

// if (!process.env.BOT_TOKEN) {
//   throw new Error("BOT_TOKEN is not defined in environment variables.");
// }

// const bot = new Telegraf(process.env.BOT_TOKEN);
const bot = new Telegraf('7280147356:AAH9c1N2lDKouexctsDd7x1fmATylHb-Lis');

const userSteps = {};

const slippageSettings = {};

const userWallets = {
  123456789: [
    { address: "0x82098bdf1e65482ad6f8a39d6ef559938d5066b781e71629ce484cbd87c97c9b", balance: "0.0" },
    // Add more wallets here
  ]
};


function formatAddress(addr) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}
// Generate Sui wallet (Sui v1.x+)
// function generateSuiWallet() {
//   const keypair = new Ed25519Keypair();
//   const privateKey = Buffer.from(keypair.getSecretKey()).toString("base64");
//   return {
//     address: keypair.getPublicKey().toSuiAddress(),
//     privateKey, // Base64-encoded
//   };
// }

// /start → Generate wallet + save to Firestore
bot.start(async (ctx) => {
  // const userId = ctx.from.id;
  // const { address, privateKey } = generateSuiWallet();

  // await saveUser(userId, {
  // walletAddress: address,
  // privateKey, // In production, encrypt this!
  // });

  await ctx.replyWithHTML(`
🚀 <b>Wallet Generated!</b>  
📌 <b>Address:</b> <code>address</code>  
📌 <b>Address:</b> <code>address</code>  
🔐 <b>Private Key:</b> <code>private key</code>  

⚠️ <i>Save your private key securely!</i>  
  `);

  await ctx.reply("Press 'Continue' to proceed:", {
    reply_markup: {
      keyboard: [[{ text: "➡️ Continue" }]],
      resize_keyboard: true,
    },
  });
  // await ctx.deleteMessage();
});

// Main menu
// bot.hears("➡️ Continue", async (ctx) => {
//   const userId = ctx.from.id;
//   // const user = await getUser(userId);
//   const user = await userId;

//   if (!user) {
//     ctx.reply("❌ Wallet not found. Use /start to generate one.");
//     return;
//   }
//   const mainMenu = {
//     reply_markup: {
//       inline_keyboard: [
//         [
//           { text: "💰 Buy", callback_data: "buy" },
//           { text: "💸 Sell", callback_data: "sell" }
//         ],
//         [
//           { text: "📊 Positions", callback_data: "positions" },
//           { text: "🎯 Sniper", callback_data: "sniper" }
//         ],
//         [
//           { text: "👥 Referrals", callback_data: "referrals" },
//           { text: "⚙️ Config", callback_data: "config" }
//         ],
//         [
//           { text: "🛠 Slippage", callback_data: "slippage" },
//           { text: "❌ Cancel", callback_data: "cancel" }
//         ]
//       ]
//     }
//   };

//   // Start command shows main menu
//   bot.start((ctx) => {
//     ctx.reply("📊 Main Menu:", mainMenu);
//   });

//   // Handle callback queries
//   bot.on('callback_query', async (ctx) => {
//     const data = ctx.callbackQuery.data;
//     await ctx.answerCbQuery(); // dismiss loading spinner

//     switch (data) {
//       case "buy":
//         return ctx.editMessageText("💰 You selected *Buy*", { parse_mode: 'Markdown' });

//       case "sell":
//         return ctx.editMessageText("💸 You selected *Sell*", { parse_mode: 'Markdown' });

//       case "positions":
//         return ctx.editMessageText("📊 Here are your current positions.");

//       case "sniper":
//         return ctx.editMessageText("🎯 Sniper mode activated!");

//       case "referrals":
//         return ctx.editMessageText("👥 You have 3 referrals.");

//       case "config":
//         return ctx.editMessageText("⚙️ Config options: [placeholder]");

//       case "slippage":
//         return ctx.editMessageText("🛠 Set your slippage percentage.");

//       case "cancel":
//         return ctx.editMessageText("❌ Action cancelled.");

//       default:
//         return ctx.editMessageText("❓ Unknown action.");
//     }
//   });
// });

const mainMenu = {
  parse_mode: "Markdown",
  reply_markup: {
    inline_keyboard: [
      [
        { text: "💰 Buy a Token", callback_data: "buy" },
        { text: "💸 Sell a Token", callback_data: "sell" }
      ],
      [
        { text: "💼 Wallets", callback_data: "wallets" },
      ],
      [
        { text: "👥 Referrals", callback_data: "referrals" },
        { text: "⚙️ Positions", callback_data: "positions" }
      ],
      [
        // { text: "🛠 Slippage", callback_data: "slippage" },
        { text: "⚙️ Config", callback_data: "config" }
        // { text: "❌ Cancel", callback_data: "cancel" }
      ]
    ]
  }
};

// ➡️ Continue handler (you can show the menu here)
bot.hears("➡️ Continue", async (ctx) => {
  const userId = ctx.from.id;

  // Replace this with real DB check
  const user = userId; // dummy check
  if (!user) {
    return ctx.reply("❌ Wallet not found. Use /start to generate one.");
  }
  const walletAddress = "0x82098bdf1e65482ad6f8a39d6ef559938d5066b781e71629ce484cbd87c97c9b";

  await ctx.reply(".", {
    reply_markup: {
      remove_keyboard: true,
    },
  });

  // await ctx.deleteMessage();

  await ctx.reply(`👋 *Welcome to Centron Bot*\n
    Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.\n
    ⬇️ *Your Wallet Address (Click to Copy)*\n\`${walletAddress}\`\n
  ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`, {
    parse_mode: "Markdown",
    ...mainMenu,
  });

  // await ctx.deleteMessage();
});


// Handle callback buttons
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  switch (data) {
    case "buy":
      userSteps[userId] = "awaiting_buy_token_address";

      return ctx.reply("🛒 You're about to buy a token.\nPlease enter the token address below.", {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true,
        },
      });

    case "sell":
      userSteps[userId] = "awaiting_sell_token_address";

      // await ctx.reply("🛒 You're about to sell a token.\nPlease enter the token address below.");

      return ctx.reply("🛒 You're about to sell a token.\nPlease enter the token address below.", {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true,
        },
      });
    case "positions":
      return ctx.editMessageText("📊 Here are your current positions.");

    case "sniper":
      return ctx.editMessageText("🎯 Sniper mode activated!");

    case "referrals":
      return ctx.editMessageText("👥 You have 3 referrals.");

    case "config":
      const configMenu = {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✏️ Buy Slippage", callback_data: "buy_slippage" },
              { text: "✏️ Sell Slippage", callback_data: "sell_slippage" }
            ],
            [
              { text: "← Back", callback_data: "back_to_menu" }
            ]
          ]
        }
      };

      return ctx.editMessageText("📍 *Settings*", configMenu);

    case "buy_slippage":
      return ctx.editMessageText("Click on a wallet to set buy slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings.all}`, callback_data: "set_buy_slippage_all" }
            ],
            [
              { text: "0x82...7c9b | 1.0%", callback_data: "set_buy_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    case "sell_slippage":
      return ctx.editMessageText("Click on a wallet to set sell slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings.all}`, callback_data: "set_sell_slippage_all" }
            ],
            [
              { text: "0x82...7c9b | 1.0%", callback_data: "set_sell_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    case "back_to_menu":
      // Simulate wallet check
      const user = userId;
      if (!user) {
        return ctx.reply("❌ Wallet not found. Use /start to generate one.");
      }

      const walletAddress = "0x82098bdf1e65482ad6f8a39d6ef559938d5066b781e71629ce484cbd87c97c9b";

      // Optional: clear any custom keyboards
      await ctx.reply("🔄 Returning to main menu...", {
        reply_markup: { remove_keyboard: true },
      });

      // Send main menu
      return ctx.reply(
        `👋 *Welcome to Centron Bot*\n
      Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.\n
      ⬇️ *Your Wallet Address (Click to Copy)*\n\`${walletAddress}\`\n
      ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`,
        {
          parse_mode: "Markdown",
          ...mainMenu,
        }
      );

    case "set_buy_slippage_all":
      userSteps[userId] = "awaiting_buy_slippage_all";
      return ctx.reply("Enter buy slippage % for *all wallets*:", {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true
        }
      });

    case "set_sell_slippage_all":
      userSteps[userId] = "awaiting_sell_slippage_all";
      return ctx.reply("Enter sell slippage % for *all wallets*:", {
        parse_mode: "Markdown",
        reply_markup: {
          force_reply: true
        }
      });

    case "wallets": {
      const userId = ctx.from.id;

      // Replace with your real data fetching logic
      const userWallets = wallets[userId] || [];

      if (userWallets.length === 0) {
        return ctx.editMessageText("😕 No wallets found. Use the buttons below to add or connect one.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ New Wallet", callback_data: "new_wallet" }],
              [{ text: "🔗 Connect Wallet", callback_data: "connect_wallet" }],
              [{ text: "← Main Menu", callback_data: "back_to_menu" }]
            ]
          }
        });
      }

      const walletButtons = await Promise.all(
        userWallets.map(async (wallet) => {
          const balance = await getBalance(wallet); // your async function to get wallet balance
          const shortAddress = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
          return [{ text: `💳 ${shortAddress} | ${balance} SUI`, callback_data: `wallet_${wallet}` }];
        })
      );

      return ctx.editMessageText(`💼 *Wallets [${userWallets.length}]*`, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "➕ New Wallet", callback_data: "new_wallet" },
              { text: "➕ X New Wallets", callback_data: "x_new_wallets" }
            ],
            [{ text: "🔗 Connect Wallet", callback_data: "connect_wallet" }],
            ...walletButtons,
            [{ text: "← Main Menu", callback_data: "back_to_menu" }]
          ]
        }
      });
    }

    case "new_wallet":
      const newWalletAddress = generateSuiWallet(); // replace with real wallet creation
      if (!userWallets[userId]) userWallets[userId] = [];

      userWallets[userId].push({ address: newWalletAddress, balance: "0.0" });

      return ctx.answerCbQuery("✅ Wallet created!");

    case "cancel":
      return ctx.editMessageText("❌ Action cancelled.");

    default:
      return ctx.editMessageText("❓ Unknown action.");
  }
});


async function getTokenInfo(address) {
  // Mock logic (you'll use a real API like SUI RPC or blockchain indexer)
  if (address === "0x82098bdf1e65482ad6f8a39d6ef559938d5066b781e71629ce484cbd87c97c9b") {
    return { name: "Centron Token", symbol: "BOT" };
  } else {
    return null;
  }
}

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const step = userSteps[userId];
  const message = ctx.message.text;

  if (!slippageSettings[userId]) {
    slippageSettings[userId] = {
      buy_all: "1.0%",
      sell_all: "1.0%",
      wallet1_buy: "1.0%",
      wallet1_sell: "1.0%"
    };
  }


  switch (step) {
    case "awaiting_buy_token_address":
    case "awaiting_sell_token_address":
      const tokenInfo = await getTokenInfo(message); // Replace with actual fetch

      if (tokenInfo) {
        await ctx.reply(`✅ Token found:\n*Name:* ${tokenInfo.name}\n*Symbol:* ${tokenInfo.symbol}`, {
          parse_mode: "Markdown",
        });
      } else {
        await ctx.reply("❌ Token not found. Please check the address and try again.");
      }

    case "awaiting_buy_slippage_all":
      if (isNaN(parseFloat(message))) {
        return ctx.reply("❌ Please enter a valid number (e.g. `1.0` for 1%)");
      }

      const newAllSlippage = `${parseFloat(message)}%`;
      if (!slippageSettings[userId]) slippageSettings[userId] = {};

      slippageSettings[userId].buy_all = newAllSlippage;
      slippageSettings[userId].wallet1_buy = newAllSlippage; // if you have more wallets, update them too

      await ctx.reply(`✅ Buy slippage for *all wallets* set to \`${newAllSlippage}\``, {
        parse_mode: "Markdown"
      });

      delete userSteps[userId];

      return ctx.reply("Click on a wallet to set buy slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings[userId].buy_all}`, callback_data: "set_buy_slippage_all" }
            ],
            [
              { text: `0x82...7c9b | ${slippageSettings[userId].wallet1_buy}`, callback_data: "set_buy_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    case "awaiting_sell_slippage_all":
      if (isNaN(parseFloat(message))) {
        return ctx.reply("❌ Please enter a valid number (e.g. `1.0` for 1%)");
      }

      const newAllSellSlippage = `${parseFloat(message)}%`;
      if (!slippageSettings[userId]) slippageSettings[userId] = {};

      slippageSettings[userId].sell_all = newAllSellSlippage;
      slippageSettings[userId].wallet1_sell = newAllSellSlippage; // if you have more wallets, update them too

      await ctx.reply(`✅ Sell slippage for *all wallets* set to \`${newAllSellSlippage}\``, {
        parse_mode: "Markdown"
      });

      delete userSteps[userId];

      return ctx.reply("Click on a wallet to set sell slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings[userId].sell_all}`, callback_data: "set_sell_slippage_all" }
            ],
            [
              { text: `0x82...7c9b | ${slippageSettings[userId].wallet1_sell}`, callback_data: "set_sell_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    case "awaiting_buy_slippage_wallet_1":
      if (isNaN(parseFloat(message))) {
        return ctx.reply("❌ Please enter a valid number (e.g. `1.0` for 1%)");
      }

      const newWalletSlippage = `${parseFloat(message)}%`;
      if (!slippageSettings[userId]) slippageSettings[userId] = {};

      slippageSettings[userId].wallet1_buy = newWalletSlippage;

      await ctx.reply(`✅ Buy slippage for *Wallet 1* set to \`${newWalletSlippage}\``, {
        parse_mode: "Markdown"
      });

      delete userSteps[userId];

      return ctx.reply("Click on a wallet to set buy slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings[userId].buy_all}`, callback_data: "set_buy_slippage_all" }
            ],
            [
              { text: `0x82...7c9b | ${slippageSettings[userId].wallet1_buy}`, callback_data: "set_buy_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    case "awaiting_sell_slippage_wallet_1":
      if (isNaN(parseFloat(message))) {
        return ctx.reply("❌ Please enter a valid number (e.g. `1.0` for 1%)");
      }

      const newWalletSellSlippage = `${parseFloat(message)}%`;
      if (!slippageSettings[userId]) slippageSettings[userId] = {};

      slippageSettings[userId].wallet1_buy = newWalletSellSlippage;

      await ctx.reply(`✅ Buy slippage for *Wallet 1* set to \`${newWalletSellSlippage}\``, {
        parse_mode: "Markdown"
      });

      delete userSteps[userId];

      return ctx.reply("Click on a wallet to set buy slippage % for it:", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ All Wallets | ${slippageSettings[userId].sell_all}`, callback_data: "set_sell_slippage_all" }
            ],
            [
              { text: `0x82...7c9b | ${slippageSettings[userId].wallet1_sell}`, callback_data: "set_sell_slippage_wallet_1" }
            ],
            [
              { text: "← Back", callback_data: "config" }
            ]
          ]
        }
      });

    default:
      break;
  }
});

// Slippage settings
bot.hears("⚙️ Slippage", (ctx) => {
  ctx.reply("Set slippage:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "1%", callback_data: "slippage_1" }],
        [{ text: "3%", callback_data: "slippage_3" }],
        [{ text: "5%", callback_data: "slippage_5" }],
      ],
    },
  });
});

// Save slippage to Firestore
bot.action(/slippage_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const slippage = parseInt(ctx.match[1]);

  // await saveUser(userId, {
  // slippage,
  // walletAddress: "",
  // privateKey: ""
  // });
  ctx.reply(`✅ Slippage set to ${slippage}%`);
});


// Listen for /wallets command
// bot.onText(/\/wallets/, async (msg) => {
// const chatId = msg.chat.id;
// const userId = msg.from.id;

// Get user from Firestore
// const user = await getUser(userId);

// if (user) {
// const { walletAddress, privateKey, seedPhrase } = user;

// const walletInfo = `👛 *Your Wallet Info:*

// 🧾 *Address:*
// \`${walletAddress || "Not set"}\`

// 🔐 *PK:*
// \`${privateKey || "Not set"}\`

// 🪄 *Seed Phrase:*
// \`${seedPhrase || "Not set"}\`

// ⚠️ *Keep this info safe and never share it with anyone!*`;
// bot.sendMessage(chatId, walletInfo, {
// parse_mode: "Markdown",
// reply_markup: {
// inline_keyboard: [
// [
// { text: "💼 Wallet Name", callback_data: "wallet_name" },
// ],
// [
// { text: "💸 Withdraw SUI", callback_data: "withdraw_sui" },
// { text: "💰 Withdraw Tokens", callback_data: "withdraw_tokens" },
// ],
// [
// { text: "🗑️ Delete", callback_data: "delete_wallet" },
// { text: "🔙 Back", callback_data: "back" }
// ]
// ]
// }
// });

// bot.sendMessage(chatId, walletInfo, { parse_mode: "Markdown" });
// } else {
// bot.sendMessage(chatId, "⚠️ No wallet info found. Please set it using /setwallet.");
// }
// });

bot.on("callback_query", async (callbackQuery) => {
  const { data, message, from } = callbackQuery;
  const chatId = message.chat.id;

  switch (data) {
    case "wallet_name":
      bot.sendMessage(chatId, "💼 Your wallet name is: MyWallet123");
      break;
    case "withdraw_sui":
      bot.sendMessage(chatId, "💸 Withdraw SUI selected. Please enter the amount.");
      break;
    case "withdraw_tokens":
      bot.sendMessage(chatId, "💰 Withdraw tokens selected. Choose a token.");
      break;
    case "delete_wallet":
      await deleteUser(from.id);
      bot.sendMessage(chatId, "🗑️ Your wallet has been deleted from our system.");
      break;
    case "back":
      bot.sendMessage(chatId, "🔙 Back to main menu...");
      break;
    default:
      bot.sendMessage(chatId, "🤔 Unknown action.");
  }
  // ✅ Always acknowledge callback to avoid Telegram loading spinner
  bot.answerCallbackQuery(callbackQuery.id);
});

bot.launch();
console.log("Bot is running!");


export default { bot, webhookCallback: bot.webhookCallback('/'), };