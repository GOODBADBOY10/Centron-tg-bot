import { buyTokenWithAftermath, sellTokenWithAftermath } from "../aftermath/aftermath.js";
import { generateQRCode } from "../qrcode/genQr.js";
import { renderMainMessage } from "./bot.js";
import { buildFullKeyboard } from "./bot.js";
import { handleBuySlippage, handleSellSlippage } from "./buySlippage.js";
import { fetchUser, saveUser, addWalletToUser, getUser } from "./db.js";
import { generateNewWallet } from "./genNewWallet.js";
import { getBalance } from "./getBalance.js";
import { handleConnectWallet } from "./handleConnectWallet.js";
import { handleWallets } from "./handleWallets.js";
import { mainMenu } from "./mainMenu.js";
import { toSmallestUnit } from "./suiAmount.js";
import { userSteps } from "./userState.js";
import { createWithdrawWalletKeyboard, isValidSuiAddress, sendSui } from "./withdrawSui.js";

const slippageSettings = {};

export async function handleAction(ctx, action, userId) {
    // const userId = ctx.from.id;
    switch (true) {
        case action === "/start":

        case action === "/wallets":
        case action === "wallets": {
            const userId = ctx.from.id;
            return await handleWallets(ctx, userId);
        }

        case action === "buy": {
            const userId = ctx.from.id;
            const user = await getUser(userId);
            const wallets = user.wallets || [];
            const validWallets = wallets.filter(w => typeof w === 'object' && (w.address || w.walletAddress));
            const firstWallet = validWallets[0]?.address || validWallets[0]?.walletAddress;

            userSteps[userId] = {
                state: "awaiting_buy_token_address",
                currentWallet: firstWallet,
                selectedWallets: firstWallet ? [firstWallet] : [],
                wallets: validWallets.map(w => w.address || w.walletAddress),
                showAllWallets: false,      // 💡 Important if you're using toggle_all_wallets
                buySlippage: firstWallet?.buySlippage ?? 0.01,
                sellSlippage: firstWallet?.sellSlippage ?? 0.01,
                mode: "buy"
            };
            console.log("userSteps for userId:", userId, userSteps[userId]);
            console.log("All userSteps:", userSteps);
            return ctx.reply("🛒 You're about to buy a token.\nPlease enter the token address below.", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true,
                },
            });
        }

        case action === "sell": {
            const userId = ctx.from.id;
            const user = await getUser(userId);
            const wallets = user.wallets || [];
            const validWallets = wallets.filter(w => typeof w === 'object' && (w.address || w.walletAddress));
            const firstWallet = validWallets[0]?.address || validWallets[0]?.walletAddress;
            // delete userSteps[userId].mainMessageId;
            userSteps[userId] = {
                state: "awaiting_sell_token_address",
                currentWallet: firstWallet,
                selectedWallets: firstWallet ? [firstWallet] : [],
                wallets: validWallets.map(w => w.address || w.walletAddress),
                showAllWallets: false,      // 💡 Important if you're using toggle_all_wallets
                mode: "sell"
            };
            console.log("userSteps for userId:", userId, userSteps[userId]);
            console.log("All userSteps:", userSteps);
            return ctx.reply("🛒 You're about to sell a token.\nPlease enter the token address below.", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true,
                },
            });
        }

        case action === "/positions":
        case "positions": {
            return ctx.editMessageText("📊 Here are your current positions.");
        }

        case "sniper":
            return ctx.editMessageText("🎯 Sniper mode activated!");

        case action === "/referrals":
        case action === "referrals": {
            const userId = ctx.from.id.toString();
            const user = await getUser(userId);
            if (!user) {
                return ctx.reply("User not found. Please start with /start.");
            }
            const referralLink = `https://t.me/${ctx.me}?start=ref_${userId}`;
            const referralCount = user.referredCount || 0;
            const referralEarnings = user.referralEarnings || 0;

            await ctx.replyWithHTML(`
                🎁 <b>Your Referral Dashboard</b>

                🔗 <b>Referral Link:</b>
                <code>${referralLink}</code>

                👥 <b>Users Referred:</b> ${referralCount}
                💸 <b>Earnings:</b> $${referralEarnings.toFixed(2)} SUI

                ✅ Share your link with friends and earn up to 35% of their trading fees!
            `, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📎 QR Code", callback_data: "show_qr" },
                            { text: "❌ Close", callback_data: "close_msg" }
                        ]
                    ]
                }
            });
            break;
        }

        case (action === 'show_qr'): {
            const userId = ctx.from.id.toString();
            const referralLink = `https://t.me/${ctx.me}?start=ref_${userId}`;
            const qrImageBuffer = await generateQRCode(referralLink); // your custom function
            await ctx.replyWithPhoto({ source: qrImageBuffer }, { caption: "Here is your referral QR code." });

            await ctx.answerCbQuery();
            break;
        }

        case (action === 'close_msg'): {
            try {
                await ctx.deleteMessage();
            } catch (err) {
                console.error("❌ Couldn't delete message:", err.message);
            }
            await ctx.answerCbQuery("Closed.");
            break;
        }

        case action === "/config":
        case action === "config": {
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

            try {
                await ctx.editMessageText("📍 *Settings*", configMenu);
            } catch (error) {
                if (error.description?.includes("message can't be edited")) {
                    // Fallback: send new message with the menu instead
                    await ctx.reply("📍 *Settings*", configMenu);
                } else {
                    throw error; // rethrow unexpected errors
                }
            }
            break;
        }

        case action === "new_wallet": {
            const userId = ctx.from.id;
            const wallet = await generateNewWallet(userId);
            const { walletAddress, privateKey } = wallet;

            const newWallet = {
                walletAddress,
                balance: "0.0"
            };
            console.log(newWallet);

            await addWalletToUser(userId.toString(), newWallet);
            // await saveUser(userId.toString(), { walletAddress });

            // if (!userWallets[userId]) userWallets[userId] = [];

            // userWallets[userId].push({ address: newWalletAddress, balance: "0.0" });

            await ctx.answerCbQuery("✅ Wallet created!");

            return ctx.editMessageText(`🎉 New wallet created!
                📌 Address: \`${walletAddress}\`
                🔐 Private Key: \`${privateKey}\`
                
                ⚠️ Please save your private key securely — it won't be shown again!`, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[
                        { text: "⬅ Back to Wallets", callback_data: "wallets" }
                    ]]
                }
            });
        }

        case action === "x_new_wallets":
            await ctx.reply("How many wallets would you like to generate? (Maximum 10)", {
                reply_markup: {
                    force_reply: true
                }
            });
            break;


        case action === "back_to_menu": {
            // Simulate wallet check
            const userId = ctx.from.id;
            const user = await fetchUser(userId);
            if (!user) {
                return ctx.reply("❌ Wallet not found. Use /start to generate one.");
            }

            // Optional: clear any custom keyboards
            await ctx.reply("🔄 Returning to main menu...", {
                reply_markup: { remove_keyboard: true },
            });

            // Send main menu
            return ctx.reply(
                `👋 *Welcome to Centron Bot*\n
                  Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.\n
                  ⬇️ *Your Wallet Address (Click to Copy)*\n\`${user.walletAddress}\`\n
                  ⬇️ *Invite friends* and earn up to *35%* of their trading fees with our 5-layered referral system!`,
                {
                    parse_mode: "Markdown",
                    ...mainMenu,
                }
            );
        }

        case action === "connect_wallet": {
            const userId = ctx.from.id;
            return await handleConnectWallet(ctx, userId)
        }

        case action === "buy_slippage": {
            const userId = ctx.from.id;
            await handleBuySlippage(ctx, userId);
            break;
        }

        case action === "set_buy_slippage_all": {
            const userId = ctx.from.id;
            userSteps[userId] = {
                awaitingSlippageInput: true,
                type: "buy",
                scope: "all"
            };
            // userSteps[userId] = "awaiting_buy_slippage_all";
            return ctx.reply("Enter buy slippage % for *all wallets*:", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
        }

        case typeof action === "string" && action.startsWith("set_buy_slippage_"): {
            // console.log("Action received:", action);
            const index = action.replace("set_buy_slippage_", "");

            const target = index === "all" ? "all" : parseInt(index);
            // Wait for user's text input
            userSteps[userId] = {
                awaitingSlippageInput: true,
                slippageTarget: target,
                type: "buy"
            };
            await ctx.reply("📝 Enter the new buy slippage % (e.g. 1.5):");
            break;
        }

        case action === "sell_slippage": {
            const userId = ctx.from.id;
            await handleSellSlippage(ctx, userId);
            break;
        }

        case action === "set_sell_slippage_all": {
            const userId = ctx.from.id;
            userSteps[userId] = {
                awaitingSlippageInput: true,
                type: "sell",
                scope: "all"
            };
            // userSteps[userId] = "awaiting_sell_slippage_all";
            return ctx.reply("Enter sell slippage % for *all wallets*:", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
        }

        case typeof action === "string" && action.startsWith("set_sell_slippage_"): {
            // console.log("Action received:", action);
            const index = action.replace("set_sell_slippage_", "");

            const target = index === "all" ? "all" : parseInt(index);
            // Wait for user's text input
            userSteps[userId] = {
                awaitingSlippageInput: true,
                slippageTarget: target,
                type: "sell"
            };
            await ctx.reply("📝 Enter the new sell slippage % (e.g. 1.5):");
            break;
        }

        case /^wallet_\d+$/.test(action): {
            const userId = ctx.from.id;
            const index = parseInt(action.split("_")[1]);
            const user = await fetchUser(userId);
            // console.log(user);
            const wallet = user.wallets?.[index];
            // console.log(wallet);

            if (!wallet || !wallet.walletAddress) {
                return ctx.answerCbQuery("Wallet not found.", { show_alert: true });
            }

            const balance = await getBalance(wallet.walletAddress);

            await ctx.editMessageText(
                `💰 *Balance:* ${balance} SUI\n📍 *Wallet:*\n\`${wallet.walletAddress}\``,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✏️ Wallet Name", callback_data: `rename_wallet_${index}` }],
                            [
                                { text: "📩 Withdraw SUI", callback_data: `withdraw_sui_${index}` },
                                { text: "📩 Withdraw Tokens", callback_data: `withdraw_tokens_${index}` }
                            ],
                            [
                                { text: "❌ Delete", callback_data: `delete_wallet_${index}` },
                                { text: "← Back", callback_data: "wallets" }
                            ]
                        ]
                    }
                }
            );
            break;
        }

        case /^delete_wallet_\d+$/.test(action): {
            const userId = ctx.from.id;
            const index = parseInt(action.split("_")[2]);
            const user = await fetchUser(userId);
            const wallet = user.wallets?.[index];
            // console.log(wallet);

            if (!wallet || !wallet.walletAddress) {
                return ctx.answerCbQuery("Wallet not found.", { show_alert: true });
            }

            await ctx.editMessageText(
                `❗ *Deleting Wallet*\n\`${wallet.walletAddress}\`\n\n_Make sure you saved your private key. This action is irreversible._`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "‼️ Delete Wallet ‼️",
                                    callback_data: `confirm_delete_wallet_${index}`,
                                },
                            ],
                            [{ text: "← Back", callback_data: `wallet_${index}` }],
                        ],
                    },
                }
            );
            break;
        }

        case /^confirm_delete_wallet_\d+$/.test(action): {
            const userId = ctx.from.id;
            const index = parseInt(action.split("_")[3]);
            const user = await fetchUser(userId);
            const wallets = user.wallets || [];

            // Remove selected wallet
            const updatedWallets = wallets.filter((_, i) => i !== index);

            await saveUser(userId, {
                wallets: updatedWallets,
            });

            await ctx.editMessageText("✅ Wallet deleted.", {
                reply_markup: {
                    inline_keyboard: [[{ text: "← Back", callback_data: "wallets" }]],
                },
            });

            break;
        }

        case action === "refresh":
            await ctx.answerCallbackQuery({ text: "🔄 Refreshing..." });
            await ctx.reply("Refreshing token info...");
            // Re-fetch token details here
            break;

        case action.startsWith("buy_"):
        case action.startsWith("sell_"): {
            const userId = ctx.from.id;
            const user = await getUser(userId); // or however you get the full wallet list
            const step = userSteps[userId];
            const wallets = user.wallets || [];
            const address = step.currentWallet;
            const currentWallet = wallets.find(
                w => (w.address || w.walletAddress)?.toLowerCase() === address?.toLowerCase()
            );

            const userPhrase = currentWallet?.seedPhrase || null;
            // const privateKey = currentWallet?.privateKey || null;
            // console.log('steps', step);
            if (!user || !step) {
                return ctx.reply("❌ User session not found. Please try again.");
            }
            // const phrase = user?.seedPhrase;
            // const address = user?.walletAddress 
            if (!step) {
                return ctx.reply("❌ No step data found for your session.");
            }
            const buySlippage = step.buySlippage;
            const sellSlippage = step.sellSlippage;
            // console.log('address', address, phrase);

            // Extract the amount from the callback, e.g. "buy_5" => "5"
            const [mode, amountStr] = action.split("_"); // mode = "buy" or "sell"
            console.log(`🛒 User ${userId} wants to buy ${amountStr} SUI`);
            const tokenAddress = step.tokenAddress;
            // console.log('token address', tokenAddress);
            if (amountStr === 'x') {
                userSteps[userId].state = mode === 'buy' ? 'awaiting_custom_buy_amount' : 'awaiting_custom_sell_amount';
                userSteps[userId].tokenAddress = step.tokenAddress; // <- Important!
                userSteps[userId].currentWallet = step.currentWallet;
                userSteps[userId].buySlippage = step.buySlippage;
                userSteps[userId].sellSlippage = step.sellSlippage;
                userSteps[userId].seedPhrase = userPhrase;
                return ctx.reply(`✍️ Please enter how much SUI you want to ${mode}:`, {
                    reply_markup: { force_reply: true },
                });
            }
            const amount = parseFloat(amountStr)
            const suiAmount = toSmallestUnit(amount)
            const suiPercentage = parseInt(amountStr, 10);
            // const suiAmount = amountStr === 'x' ? 0.1 : parseFloat(amountStr);
            if (!userPhrase || !address) {
                return ctx.reply("❌ Wallet or recovery phrase is not set.");
            }
            await ctx.reply(`⏳ ${mode === 'buy' ? "Buying" : "Selling"} token...`);

            try {
                const success = mode === 'buy'
                    ? await buyTokenWithAftermath({
                        tokenAddress,
                        phrase: userPhrase,
                        // suiAmount: "10000000",
                        suiAmount,
                        slippage: buySlippage
                    })
                    : await sellTokenWithAftermath({
                        tokenAddress,
                        phrase: userPhrase,
                        suiPercentage,
                        slippage: sellSlippage
                    }); // Implement this too

                if (success) {
                    await ctx.reply(`✅ Successfully ${mode === 'buy' ? "bought" : "sold"} token with ${amount} SUI.`);
                } else {
                    await ctx.reply(`❌ Failed to ${mode}. Please try again.`);
                }
            } catch (error) {
                console.error('Buy/Sell error:', error);
                await ctx.reply(`❌ Error occurred: ${error.message || error}`);
            }

            await ctx.answerCbQuery(); // Clean up UI
            return;
        }

        case action.startsWith("withdraw_sui_"): {
            const index = Number(action.split("_").pop());
            const userId = ctx.from.id.toString();

            userSteps[userId] = {
                state: "awaiting_withdraw_address",
                selectedWalletIndex: index,
            };

            const user = await fetchUser(userId);
            const selectedWallet = user.wallets[index];
            console.log('This is the selected wallet', selectedWallet)
            console.log('This is the selected wallet key', selectedWallet.walletPrivateKey)
            console.log('This is the selected wallet key', selectedWallet.seedPhrase)

            userSteps[userId].seedPhrase = selectedWallet.seedPhrase;
            userSteps[userId].walletAddress = selectedWallet.walletAddress;

            await ctx.answerCbQuery("✅ Wallet selected");
            await ctx.editMessageReplyMarkup(createWithdrawWalletKeyboard(userId)); // Optional, for updated UI
            return ctx.reply(`🔗 Enter the address you want to send SUI to from:\n<code>${selectedWallet.walletAddress}</code>`, {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
        }

        case userSteps[userId]?.state === "awaiting_withdraw_address": {
            const address = ctx.message.text.trim();
            const userId = ctx.from.id.toString();

            // if (!isValidSuiAddress(address)) {
            //     return ctx.reply("❌ Invalid SUI address. Please try again.");
            // }

            userSteps[userId].withdrawAddress = address;
            userSteps[userId].state = "awaiting_withdraw_amount";

            return ctx.reply("💸 How much SUI would you like to withdraw?", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
        }

        case userSteps[userId]?.state === "awaiting_withdraw_amount": {
            const amount = parseFloat(ctx.message.text.trim());
            const userId = ctx.from.id.toString();
            // console.log(userId);

            if (isNaN(amount) || amount <= 0) {
                return ctx.reply("❌ Invalid amount. Please enter a valid number.");
            }

            userSteps[userId].withdrawAmount = amount;

            // const user = await fetchUser(userId);
            // console.log("🧪 Wallets fetched for user:", JSON.stringify(user.wallets));
            // console.log(user.wallets)
            // const walletIndex = userSteps[userId].selectedWalletIndex;
            // const walletAddress = user?.walletAddress
            // console.log(walletAddress);
            // const senderWallet = user.wallets[walletIndex];
            // const base64PrivateKey = await getPrivateKey(userId, walletAddress);
            // const seed_phrase = await getSeedPhrase(userId, walletAddress);
            // console.log(base64PrivateKey);
            // const toAddress = userSteps[userId].withdrawAddress;
            // console.log("the toaddress is", toAddress);

            const { withdrawAddress, selectedWalletIndex } = userSteps[userId];

            const user = await fetchUser(userId);
            console.log("User data available:", !!user);
            console.log("User wallets available:", user && !!user.wallets);
            console.log("Selected wallet index:", selectedWalletIndex);

            if (!user || !user.wallets || !user.wallets[selectedWalletIndex]) {
                console.error("Cannot find selected wallet for user");
                return ctx.reply("❌ Error: Cannot find your selected wallet. Please try again.");
            }

            const selectedWallet = user.wallets[selectedWalletIndex];
            console.log("Selected wallet:", {
                hasAddress: !!selectedWallet.walletAddress,
                hasPrivateKey: !!selectedWallet.seedPhrase,
                privateKeyType: selectedWallet.seedPhrase ? typeof selectedWallet.seedPhrase : "N/A"
            });

            // Get the wallet's private key - USE THE CORRECT PROPERTY NAME
            // It might be 'privateKey' instead of 'walletPrivateKey'
            const walletPrivateKey = selectedWallet.seedPhrase || selectedWallet.seedPhrase;

            if (!walletPrivateKey) {
                console.error("No private key found in the wallet");
                return ctx.reply("❌ Error: Could not find private key for the selected wallet.");
            }

            console.log(`Processing withdrawal: ${amount} SUI to ${withdrawAddress}`);

            // Send a processing message
            await ctx.reply("⏳ Processing your withdrawal request...");

            // Send the SUI transaction (replace with your own method)
            try {
                const tx = await sendSui(
                    walletPrivateKey,
                    withdrawAddress,
                    amount,
                );
                return ctx.reply(`✅ Successfully sent ${amount} SUI to:\n<code>${withdrawAddress}</code>\n\nTransaction: <code>Tx Hash${tx.digest}</code>`, {
                    parse_mode: "HTML"
                });
            } catch (err) {
                console.error(err);
                return ctx.reply("❌ Failed to send withdrawal.");
            } finally {
                delete userSteps[userId];
            }
        }

        case action.startsWith("toggle_wallet:"): {
            const userId = ctx.from.id;
            const userStep = userSteps[userId] || {};
            // const index = parseInt(action.split(":")[1], 10);

            if (!userStep.wallets) {
                const user = await getUser(userId);
                const rawWallets = user.wallets || [];
                userStep.wallets = rawWallets.filter(w => typeof w === "object" && (w.address || w.walletAddress));
            }
            const wallets = userStep.wallets;
            console.log('wallets', wallets);
            const index = parseInt(action.split(":")[1], 10);

            const wallet = wallets[index];
            // const address = wallet?.address || wallet?.walletAddress;
            const address = wallet;  // wallet is already the address string

            // console.log("Wallets available:", wallets);
            // console.log("Selected index:", index, "Resolved address:", address);
            if (!address) {
                await ctx.answerCbQuery("❌ Invalid wallet selected.");
                return;
            }
            // Normalize addresses to lowercase for consistent comparison
            const selected = (userStep.selectedWallets || []).map(a => a.toLowerCase());
            if (selected.includes(address.toLowerCase())) {
                userStep.selectedWallets = selected.filter(a => a !== address.toLowerCase());
            } else {
                userStep.selectedWallets = [...selected, address.toLowerCase()];
            }

            // ✅ Update currentWallet to the last selected one (or any logic you want)
            if (userStep.selectedWallets.length > 0) {
                userStep.currentWallet = userStep.selectedWallets[userStep.selectedWallets.length - 1];
            }
            userSteps[userId] = userStep;
            // userStep.selectedWallets = selected;

            // Update inline keyboard with normalized addresses for selection
            // await ctx.editMessageReplyMarkup({
            // inline_keyboard: buildFullKeyboard(userStep.selectedWallets, wallets),
            // });
            await renderMainMessage(ctx, userId);

            await ctx.answerCbQuery("✅ Updated selection");
            return;
        }

        case action === "toggle_all_wallets": {
            const userId = ctx.from.id;
            const step = userSteps[userId];
            if (!step) return;

            step.showAllWallets = !step.showAllWallets;

            const keyboard = buildFullKeyboard(
                step.selectedWallets || [],
                step.wallets || [],
                step.showAllWallets
            );

            await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
            return ctx.answerCbQuery("✅ Wallet view updated");
        }

        case action === "toggle_mode": {
            const userId = ctx.from.id;
            const step = userSteps[userId];
            console.log('my-step', step);
            if (!step) return;
            console.log("Before toggle:", step.mode); // Debug print current mode            
            // Toggle between buy and sell
            step.mode = step.mode === "buy" ? "sell" : "buy";
            console.log("After toggle:", step.mode); // Debug print toggled mode

            const keyboard = buildFullKeyboard(
                step.selectedWallets || [],
                step.wallets || [],
                step.showAllWallets ?? false,
                userSteps[userId].mode
                // step.mode // <-- pass mode here
            );
            console.log(`User ${userId} toggled mode to ${step.mode}`);
            try {
                // await ctx.telegram.editMessageReplyMarkup(
                //     ctx.chat.id,
                //     ctx.update.callback_query.message.message_id,
                //     undefined,
                //     { inline_keyboard: keyboard }
                // )
                await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
                console.log("Generated keyboard", JSON.stringify(keyboard, null, 2));
                //  await renderMainMessage(ctx, userId);
            } catch (err) {
                console.error("Failed to update keyboard:", err.message);
            }
            return ctx.answerCbQuery(`✅ Switched to ${step.mode.toUpperCase()} mode`);
        }

        case action === "cancel": {
            // Clear step manually (since you're not using Firebase or a helper)
            delete userSteps[userId]; // or: userSteps[userId] = undefined;

            await ctx.answerCbQuery("❌ Cancelled");
            await ctx.reply("Action cancelled.");
            break;
        }

        case action === "cancel_to_main": {
            // Clear inline keyboard and show main menu
            try {
                // ✅ Delete the current message
                await ctx.deleteMessage();
                await ctx.reply(
                    `👋 *Welcome to Centron Bot*\n` +
                    `Trade tokens on SUI with the fastest trading bot. All DEXes + MovePump are supported.`,
                    {
                        parse_mode: "Markdown",
                        ...mainMenu // make sure mainMenu includes { reply_markup }
                    }
                );
            } catch (err) {
                console.error("Error returning to main menu:", err.message);
            };
            break;
        }

        // Step 2: Continue after wallet selected
        case action === "withdraw_continue": {
            const userId = ctx.from.id;
            if (!userSteps[userId]) return ctx.answerCbQuery("❌ Start over");

            userSteps[userId].state = "awaiting_withdraw_amount";

            await ctx.answerCbQuery();
            return ctx.reply("📤 Enter the amount of SUI to withdraw to:", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true,
                },
            });
        }

        // Step 3: Optional cancel
        case action === "withdraw_cancel": {
            const userId = ctx.from.id;
            userSteps[userId] = null;

            await ctx.answerCbQuery("❌ Withdraw cancelled");
            return ctx.editMessageText("🔙 Back to main menu");
        }

        default:
            return await ctx.reply("⚠️ Unknown command.");
    }
    // return ctx.reply("⚠️ Unknown command.");
}