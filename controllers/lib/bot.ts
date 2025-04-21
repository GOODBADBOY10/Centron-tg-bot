import { Telegraf } from "telegraf";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { message } from "telegraf/filters";
import { saveUser, getUser } from "./db.js";

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined in environment variables.");
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Generate Sui wallet (Sui v1.x+)
function generateSuiWallet() {
  const keypair = new Ed25519Keypair();
  const privateKey = Buffer.from(keypair.getSecretKey()).toString("base64");
  return {
    address: keypair.getPublicKey().toSuiAddress(),
    privateKey, // Base64-encoded
  };
}

// /start → Generate wallet + save to Firestore
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const { address, privateKey } = generateSuiWallet();

  await saveUser(userId, {
    walletAddress: address,
    privateKey, // In production, encrypt this!
  });

  await ctx.replyWithHTML(`
🚀 <b>Wallet Generated!</b>  
📌 <b>Address:</b> <code>${address}</code>  
🔐 <b>Private Key:</b> <code>${privateKey}</code>  

⚠️ <i>Save your private key securely!</i>  
  `);

  await ctx.reply("Press 'Continue' to proceed:", {
    reply_markup: {
      keyboard: [[{ text: "➡️ Continue" }]],
      resize_keyboard: true,
    },
  });
});

// Main menu
bot.hears("➡️ Continue", async (ctx) => {
  const userId = ctx.from.id;
  const user = await getUser(userId);

  if (!user) {
    ctx.reply("❌ Wallet not found. Use /start to generate one.");
    return;
  }

  ctx.reply("📊 Main Menu:", {
    reply_markup: {
      keyboard: [
        ["💰 Buy", "💸 Sell"],
        ["📊 Positions", "🎯 Sniper"],
        ["⚙️ Slippage"],
      ],
      resize_keyboard: true,
    },
  });
});

// Handle menu buttons
bot.hears(["💰 Buy", "💸 Sell", "📊 Positions", "🎯 Sniper"], (ctx) => {
  ctx.reply(`🛠️ ${ctx.message.text} feature coming soon!`);
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

  await saveUser(userId, {
      slippage,
      walletAddress: "",
      privateKey: ""
  });
  ctx.reply(`✅ Slippage set to ${slippage}%`);
});

bot.launch();
console.log("Bot is running!");


exports = {
  bot,
  webhookCallback: bot.webhookCallback('/'),
};