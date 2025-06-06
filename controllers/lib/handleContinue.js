import { fetchUser } from "./db.js";
import { mainMenu } from "./mainMenu.js";

export async function handleContinue(ctx) {
    const userId = ctx.from.id;
    const user = await fetchUser(userId);

    if (!user || !user.walletAddress) {
        return ctx.reply("❌ Wallet not found. Use /start to generate one.");
    }

    // Clear reply keyboard
    await ctx.reply(".", {
        reply_markup: { remove_keyboard: true },
    });

    await ctx.reply(`👋 *Welcome to Centron Bot*\n
        Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.\n
        ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`, {
        parse_mode: "Markdown",
        ...mainMenu,
    });
};
