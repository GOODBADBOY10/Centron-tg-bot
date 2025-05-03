import { fetchUser, updateBuySlippage } from './db.js';

export async function handleBuySlippage(ctx, userId) {
    const user = await fetchUser(userId);
    const wallets = user?.wallets || [];

    if (wallets.length === 0) {
        return ctx.reply("😕 No wallets found.");
    }

    const buttons = [];

    // Option to set slippage for all wallets
    buttons.push([{ text: `✅ All Wallets | ${wallets[0].buySlippage || "1.0"}%`, callback_data: `set_buy_slippage_all` }]);

    // Individual wallets
    for (const wallet of wallets) {
        console.log(wallet);
        if (!wallet.walletAddress) continue;
        const short = `${wallet.walletAddress.slice(0, 4)}...${wallet.walletAddress.slice(-4)}`;
        buttons.push([{
            text: `${short} | ${wallet.buySlippage || "1.0"}%`,
            callback_data: `set_slippage_${wallet.walletAddress}`
        }]);
    }

    buttons.push([{ text: "← Back", callback_data: "back_to_menu" }]);

    await ctx.editMessageText(`Click on a wallet to set buy slippage % for it:\n\n📘 [How to Use?](https://example.com/help)`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
    });
}
