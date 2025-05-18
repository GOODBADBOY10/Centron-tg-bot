import { buyTokenWithAftermath } from "../aftermath/aftermath.js";
import { buyTokenSui, buyTokenSuiHop } from "../aggregators/aggregator.js";
import { generateQRCode } from "../qrcode/genQr.js";
import { handleBuySlippage, handleSellSlippage } from "./buySlippage.js";
import { fetchUser, saveUser, addWalletToUser, getUser } from "./db.js";
import { generateNewWallet } from "./genNewWallet.js";
import { getBalance } from "./getBalance.js";
import { handleConnectWallet } from "./handleConnectWallet.js";
import { handleWallets } from "./handleWallets.js";
import { mainMenu } from "./mainMenu.js";
import { userSteps } from "./userState.js";
import { createWithdrawWalletKeyboard, isValidSuiAddress, sendSui } from "./withdrawSui.js";

const slippageSettings = {};

export async function handleAction(ctx, action, userId) {
    // const userId = ctx.from.id;
    switch (true) {
        case action === "/start":
        case action === "/config":
        case action === "/positions":
        case action === "/referrals":
        case action === "/wallets":

        case action === "wallets": {
            const userId = ctx.from.id;
            return await handleWallets(ctx, userId);
        }

        case action === "buy": {
            const userId = ctx.from.id;
            userSteps[userId] = { state: "awaiting_buy_token_address" };
            return ctx.reply("🛒 You're about to buy a token.\nPlease enter the token address below.", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true,
                },
            });
        }

        case "sell": {
            const userId = ctx.from.id;
            userSteps[userId] = "awaiting_sell_token_address";

            // await ctx.reply("🛒 You're about to sell a token.\nPlease enter the token address below.");

            return ctx.reply("🛒 You're about to sell a token.\nPlease enter the token address below.", {
                parse_mode: "Markdown",
                reply_markup: {
                    force_reply: true,
                },
            });
        }

        case "positions": {
            return ctx.editMessageText("📊 Here are your current positions.");
        }

        case "sniper":
            return ctx.editMessageText("🎯 Sniper mode activated!");

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

            await ctx.editMessageText("📍 *Settings*", configMenu);
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
            userSteps[userId] = "awaiting_buy_slippage_all";
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
                type: "sell"
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
            userSteps[userId] = "awaiting_sell_slippage_all";
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

        // case action === "cancel":
        //     return ctx.editMessageText("❌ Action cancelled.");

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

        case action.startsWith("buy_"): {
            const amountStr = action.split("_")[1]; // "1.0", "5.0", or "x"
            console.log(`🛒 User ${userId} wants to buy ${amountStr} SUI`);
            // await ctx.answerCallbackQuery({ text: `Buying ${amountStr} SUI...` });
            const user = await getUser(userId);
            // console.log(user);
            const phrase = user?.seedPhrase;
            // console.log(phrase);
            const address = user?.walletAddress;
            const step = user?.step
            // const tokenAddress = step.tokenAddress;
            const tokenAddress = '0x468b99a00a0b4e5188cef9a7f431d57025774e7749314400881345229fb65d5c::suiper::SUIPER';
            const suiAmount = parseFloat(amountStr);
            if (!phrase || !address) {
                return ctx.reply("❌ Wallet or recovery phrase is not set.");
            }
            await ctx.reply("⏳ Buying token...");

            const success = await buyTokenWithAftermath({ userId, tokenAddress, address, suiAmount, phrase });
            if (success) {
                ctx.reply(`✅ Successfully bought token with ${suiAmount} SUI.`);
            } else {
                ctx.reply("❌ Failed to buy token. Please try again.");
            }

            await ctx.reply(`Processing purchase of ${amountStr} SUI...`);
            break;
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
            const address = action.split(":")[1];
            const userStep = userSteps[ctx.from.id] || {};

            // You must make sure wallets are fetched or reused
            const user = await getUser(ctx.from.id);
            const wallets = user.wallets || [];

            // Store wallets in userStep (used for rendering the keyboard)
            userStep.wallets = wallets;

            const selected = userStep.selectedWallets || [];
            if (selected.includes(address)) {
                userStep.selectedWallets = selected.filter(a => a !== address);
            } else {
                userStep.selectedWallets = [...selected, address];
            }

            userSteps[ctx.from.id] = userStep;

            const updatedText = `Select wallets to use for buying:`; // You can customize this

            await ctx.editMessageText(updatedText, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: buildFullKeyboard(userStep.selectedWallets, wallets),
                }
            });
            return;
        }


        case action === "cancel": {
            // Clear step manually (since you're not using Firebase or a helper)
            delete userSteps[userId]; // or: userSteps[userId] = undefined;

            await ctx.answerCbQuery("❌ Cancelled");
            await ctx.reply("Action cancelled.");
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



// if (step) {
//   const userToString = String(userId);
//   const slippage = parseFloat(text);
//   console.log(slippage);
//   if (isNaN(slippage) || slippage <= 0 || slippage > 50) {
//     return ctx.reply("❌ Invalid slippage. Please enter a number between 0.1 and 50.");
//   }
//   try {
//     if (step === "awaiting_buy_slippage_all") {
//       await updateAllBuyWalletsSlippage(userToString, slippage);
//       await ctx.reply(`✅ Buy slippage updated to ${slippage}% for all wallets`);
//     } else if (step.awaitingSlippageInput) {
//       const target = step.slippageTarget;
//       await updateBuySlippage(userToString, target, slippage);
//       await ctx.reply(`✅ Buy slippage updated to ${slippage}%`);
//     }

//     delete userSteps[userId]; // Clean up
//     await handleBuySlippage(ctx, userId); // Show updated menu
//     return;
//   } catch (err) {
//     console.error(err);
//     return ctx.reply("❌ Failed to update slippage.");
//   }
// }