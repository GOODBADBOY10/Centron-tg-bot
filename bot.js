"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const db_1 = require("./db");
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
// Generate Sui wallet (Sui v1.x+)
function generateSuiWallet() {
    const keypair = new ed25519_1.Ed25519Keypair();
    const privateKey = Buffer.from(keypair.getSecretKey()).toString("base64");
    return {
        address: keypair.getPublicKey().toSuiAddress(),
        privateKey, // Base64-encoded
    };
}
// /start → Generate wallet + save to Firestore
bot.start((ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ctx.from.id;
    const { address, privateKey } = generateSuiWallet();
    yield (0, db_1.saveUser)(userId, {
        walletAddress: address,
        privateKey, // In production, encrypt this!
    });
    yield ctx.replyWithHTML(`
🚀 <b>Wallet Generated!</b>  
📌 <b>Address:</b> <code>${address}</code>  
🔐 <b>Private Key:</b> <code>${privateKey}</code>  

⚠️ <i>Save your private key securely!</i>  
  `);
    yield ctx.reply("Press 'Continue' to proceed:", {
        reply_markup: {
            keyboard: [[{ text: "➡️ Continue" }]],
            resize_keyboard: true,
        },
    });
}));
// Main menu
bot.hears("➡️ Continue", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ctx.from.id;
    const user = yield (0, db_1.getUser)(userId);
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
}));
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
bot.action(/slippage_(\d+)/, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = ctx.from.id;
    const slippage = parseInt(ctx.match[1]);
    yield (0, db_1.saveUser)(userId, {
        slippage,
        walletAddress: "",
        privateKey: ""
    });
    ctx.reply(`✅ Slippage set to ${slippage}%`);
}));
bot.launch();
console.log("Bot is running!");
