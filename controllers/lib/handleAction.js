import { getTokensInWallet } from "../../utils/getTokenDetails.js";
import { buyTokenWithAftermath, sellTokenWithAftermath } from "../aftermath/aftermath.js";
import { generateQRCode } from "../qrcode/genQr.js";
import { renderMainMessage } from "./bot.js";
import { buildFullKeyboard } from "./bot.js";
import { handleBuySlippage, handleSellSlippage } from "./buySlippage.js";
import { fetchUserStep } from "./db.js";
import { saveOrUpdatePosition } from "./db.js";
import { getUserPositions } from "./db.js";
import { getUserWallets } from "./db.js";
import { saveUserStep } from "./db.js";
import { fetchUser, saveUser, addWalletToUser, getUser } from "./db.js";
import { generateNewWallet } from "./genNewWallet.js";
import { getBalance } from "./getBalance.js";
import { handleBuy } from "./handleBuy.js";
import { handleConfig } from "./handleConfig.js";
import { handleConnectWallet } from "./handleConnectWallet.js";
import { handleReferrals } from "./handleReferrals.js";
import { handleSell } from "./handleSell.js";
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


        case action === "wallets": {
            const userId = ctx.from.id;
            return await handleWallets(ctx, userId);
        }


        case action === "buy": {
            await handleBuy(ctx, userId);
            break;
        }


        case action === "sell": {
            await handleSell(ctx, userId);
            break;
        }

        case action === "positions": {
            const userId = ctx.from.id.toString();
            try {
                const user = await fetchUser(userId)
                const positions = await getUserPositions(userId);
                // const positions = await getTokensInWallet("0x456f178712fe771207b107ba499b42d45e997ec96b81db62f7134c0f619a7e45");
                console.log("positions", positions);
                if (!positions.length) {
                    return ctx.reply('📭 No positions found. Use /buy to get started.');
                }
            } catch (e) {
                console.log('error', e)
            }
            // return ctx.editMessageText("📊 Here are your current positions.");
            break;
        }

        case action === "referrals": {
            await handleReferrals(ctx, userId);
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

        case action === "config": {
            await handleConfig(ctx, userId);
            break;
        }

        case action === "new_wallet": {
            try {
                const userId = ctx.from.id;
                const wallet = await generateNewWallet(userId);
                const { walletAddress, privateKey, seedPhrase } = wallet;

                const newWallet = {
                    walletAddress,
                    privateKey, // Add this line
                    seedPhrase, // Add this line
                    balance: "0.0"
                };
                console.log(newWallet);

                await addWalletToUser(userId.toString(), newWallet);

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
            } catch (error) {
                console.error("Error creating new wallet:", error);
                await ctx.answerCbQuery("❌ Failed to create wallet. Please try again.", { show_alert: true });
                // Optionally, you can edit the message or send a new one here to inform the user
            }
            break;
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
            await saveUserStep(userId, {
                awaitingSlippageInput: true,
                scope: "all", // or "wallet"
                type: "buy",  // or "sell"
                // slippageTarget: "wallet1", // optional
            });
            // userSteps[userId] = {
            //     awaitingSlippageInput: true,
            //     type: "buy",
            //     scope: "all"
            // };
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
            await saveUserStep(userId, {
                awaitingSlippageInput: true,
                // scope: "all", // or "wallet"
                slippageTarget: target, // optional
                type: "buy",  // or "sell"
            });
            // userSteps[userId] = {
            //     awaitingSlippageInput: true,
            //     slippageTarget: target,
            //     type: "buy"
            // };
            return ctx.reply("Enter the new buy slippage % (e.g. 1)", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
        }

        case action === "sell_slippage": {
            const userId = ctx.from.id;
            await handleSellSlippage(ctx, userId);
            break;
        }

        case action === "set_sell_slippage_all": {
            const userId = ctx.from.id;
            await saveUserStep(userId, {
                awaitingSlippageInput: true,
                scope: "all", // or "wallet"
                type: "sell",  // or "sell"
            });
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
            await saveUserStep(userId, {
                awaitingSlippageInput: true,
                slippageTarget: target, // optional
                type: "sell",  // or "sell"
            });
            return ctx.reply("Enter the new sell slippage % (e.g. 1):", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true
                }
            });
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
            // const step = userSteps[userId];
            const step = user.step || {};
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
                const step = await fetchUserStep(userId);
                const mode = step?.mode || 'buy';
                const updatedStep = {
                    ...step,
                    state: mode === 'buy' ? 'awaiting_custom_buy_amount' : 'awaiting_custom_sell_amount',
                    tokenAddress: step.tokenAddress, // preserve existing
                    currentWallet: step.currentWallet,
                    buySlippage: step.buySlippage,
                    sellSlippage: step.sellSlippage,
                    seedPhrase: step.seedPhrase || userPhrase,
                };

                await saveUserStep(userId, updatedStep); // Save back to DB
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

                if (success && mode === 'buy') {
                    const {
                        tokenAmountReceived,
                        tokenSymbol,
                        tokenAddress: actualTokenAddress,
                        spentSUI
                    } = success;

                    await saveOrUpdatePosition(userId, {
                        tokenAddress: actualTokenAddress || tokenAddress,
                        symbol: tokenSymbol,
                        amountBought: tokenAmountReceived, // in raw units (like 7.83B)
                        amountInSUI: spentSUI             // in normal unit (like 0.01 SUI)
                    });
                    await ctx.reply(`✅ Successfully bought ${tokenSymbol} using ${amount} SUI.`);
                } else if (success) {
                    await ctx.reply(`✅ Successfully sold token with ${amount} SUI.`);
                }

                // if (success) {
                // await ctx.reply(`✅ Successfully ${mode === 'buy' ? "bought" : "sold"} token with ${amount} SUI.`);
                // } else {
                // await ctx.reply(`❌ Failed to ${mode}. Please try again.`);
                // }
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
            let step = await fetchUserStep(userId);
            if (!step) step = {};

            if (!step.wallets) {
                const user = await getUser(userId);
                const rawWallets = user.wallets || [];
                step.wallets = rawWallets.filter(w => typeof w === "object" && (w.address || w.walletAddress))
                    .map(w => w.address || w.walletAddress);
            }

            const wallets = step.wallets;
            const index = parseInt(action.split(":")[1], 10);

            const address = wallets[index]; // wallet is address string now

            if (!address) {
                await ctx.answerCbQuery("❌ Invalid wallet selected.");
                return;
            }

            const selected = (step.selectedWallets || []).map(a => a.toLowerCase());

            if (selected.includes(address.toLowerCase())) {
                step.selectedWallets = selected.filter(a => a !== address.toLowerCase());
            } else {
                step.selectedWallets = [...selected, address.toLowerCase()];
            }

            if (step.selectedWallets.length > 0) {
                step.currentWallet = step.selectedWallets[step.selectedWallets.length - 1];
            }

            await saveUserStep(userId, step);

            // optionally cache in memory if needed
            // userSteps[userId] = step;

            await ctx.answerCbQuery("✅ Updated selection");
            await renderMainMessage(ctx, userId);

            return;
        }

        case action === "toggle_all_wallets": {
            const userId = ctx.from.id;
            // const step = userSteps[userId];
            let step = await fetchUserStep(userId);
            if (!step) step = {};

            step.showAllWallets = !step.showAllWallets;

            const keyboard = buildFullKeyboard(
                step.selectedWallets || [],
                step.wallets || [],
                step.showAllWallets,
                // step.mode || 'buy'
            );

            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
                await saveUserStep(userId, step);
            } catch (error) {
                console.error('Failed to update wallet toggle keyboard:', error.message);
            }

            return ctx.answerCbQuery("✅ Wallet view updated");
        }

        case action === "toggle_mode": {
            const userId = ctx.from.id;
            let step = await fetchUserStep(userId);
            if (!step) step = {};
            // const step = userSteps[userId];
            // console.log('my-step', step);
            // Toggle between buy and sell
            if (!step.mode) step.mode = "buy"; // default to buy first time
            step.mode = step.mode === "buy" ? "sell" : "buy";

            const keyboard = buildFullKeyboard(
                step.selectedWallets || [],
                step.wallets || [],
                step.showAllWallets ?? false,
                // userSteps[userId].mode
                step.mode
                // step.mode // <-- pass mode here
            );
            console.log(`User ${userId} toggled mode to ${step.mode}`);
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
                await saveUserStep(userId, step);
                // console.log("Generated keyboard", JSON.stringify(keyboard, null, 2));
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