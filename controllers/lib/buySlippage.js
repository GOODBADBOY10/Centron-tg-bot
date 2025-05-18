import { updateUser } from './db.js';
import { fetchUser } from './db.js';

export async function handleBuySlippage(ctx, userId) {
    const user = await fetchUser(userId);
    const wallets = user?.wallets || [];

    if (wallets.length === 0) {
        return ctx.reply("😕 No wallets found.");
    }

    const buttons = [];

    // Option to set slippage for all wallets
    // buttons.push([{ text: `✅ All Wallets | ${wallets[0].buySlippage || "1.0"}%`, callback_data: `set_buy_slippage_all` }]);
    buttons.push([{ text: `✅ All Wallets | ${user.buySlippage || "1.0"}%`, callback_data: `set_buy_slippage_all` }]);

    // Individual wallets
    // for (const wallet of wallets) {
    //     // console.log(wallet);
    //     if (!wallet.walletAddress) continue;
    //     const short = `${wallet.walletAddress.slice(0, 4)}...${wallet.walletAddress.slice(-4)}`;
    //     buttons.push([{
    //         text: `${short} | ${wallet.buySlippage || "1.0"}%`,
    //         callback_data: `set_buy_slippage_${wallet.walletAddress.slice(0, 10)}`
    //     }]);
    // }

    wallets.forEach((wallet, index) => {
        if (!wallet.walletAddress) return;
        const short = `${wallet.walletAddress.slice(0, 4)}...${wallet.walletAddress.slice(-4)}`;
        buttons.push([{
            text: `${short} | ${wallet.buySlippage || "1.0"}%`,
            callback_data: `set_buy_slippage_${index}`
        }]);
    });

    buttons.push([{ text: "← Back", callback_data: "back_to_menu" }]);
    const messageText = `Click on a wallet to set buy slippage % for it:\n\n📘 [How to Use?](https://example.com/help)`;
    const options = {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: buttons }
    };

     try {
        // Try to edit the message if possible
        await ctx.editMessageText(messageText, options);
    } catch (error) {
        // If editing fails (no message to edit or other issue), send a new message
        await ctx.reply(messageText, options);
    }
}


export async function updateAllBuyWalletsSlippage(userId, slippage) {
    try {
        const user = await fetchUser(userId);
        if (!user) throw new Error("User not found");

        const updatedUser = {
            ...user,
            buySlippage: slippage,
            wallets: (user.wallets || []).map(wallet => ({
                ...wallet,
                buySlippage: slippage
            }))
        };

        await updateUser(userId, updatedUser);
    } catch (error) {
        console.error("Error updating all wallets slippage:", error);
        throw error;
    }
}


export async function handleSellSlippage(ctx, userId) {
    const user = await fetchUser(userId);
    const wallets = user?.wallets || [];

    if (wallets.length === 0) {
        return ctx.reply("😕 No wallets found.");
    }

    const buttons = [];
    // Option to set slippage for all wallets
    buttons.push([{ text: `✅ All Wallets | ${user.sellSlippage || "1.0"}%`, callback_data: `set_sell_slippage_all` }]);
    wallets.forEach((wallet, index) => {
        if (!wallet.walletAddress) return;
        const short = `${wallet.walletAddress.slice(0, 4)}...${wallet.walletAddress.slice(-4)}`;
        buttons.push([{
            text: `${short} | ${wallet.sellSlippage || "1.0"}%`,
            callback_data: `set_sell_slippage_${index}`
        }]);
    });

    buttons.push([{ text: "← Back", callback_data: "back_to_menu" }]);
    const messageText = `Click on a wallet to set sell slippage % for it:\n\n📘 [How to Use?](https://example.com/help)`;
    const options = {
        parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: buttons }
    };

     try {
        // Try to edit the message if possible
        await ctx.editMessageText(messageText, options);
    } catch (error) {
        // If editing fails (no message to edit or other issue), send a new message
        await ctx.reply(messageText, options);
    }
}

export async function updateAllSellWalletsSlippage(userId, slippage) {
    try {
        const user = await fetchUser(userId);
        if (!user) throw new Error("User not found");

        const updatedUser = {
            ...user,
            sellSlippage: slippage,
            wallets: (user.wallets || []).map(wallet => ({
                ...wallet,
                sellSlippage: slippage
            }))
        };

        await updateUser(userId, updatedUser);
    } catch (error) {
        console.error("Error updating all wallets slippage:", error);
        throw error;
    }
}
