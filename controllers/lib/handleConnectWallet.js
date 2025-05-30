import { saveUser } from "./db.js";

export async function handleConnectWallet(ctx, userId) {
    await ctx.reply("🔐 *What's the mnemonic phrase or private key of this wallet?*\n\n_Reply to this message to connect your wallet._", {
        parse_mode: "Markdown",
        reply_markup: {
            force_reply: true
        },
    });
    await saveUser(userId, { awaitingWallet: true });
}

// return ctx.editMessageText("🔐 *What's the mnemonic phrase or private key of this wallet?*\n\n_Reply to this message to connect your wallet._", {
//     parse_mode: "Markdown",
//     reply_markup: {
//         inline_keyboard: [[{ text: "← Back", callback_data: "wallets" }]],
//     },
// });

// await ctx.reply("🔐 *What's the mnemonic phrase or private key of this wallet?*\n\n_Reply to this message to connect your wallet._", {
//     parse_mode: "Markdown",
//     reply_markup: {
//     }
// });

