import { handleBuySlippage } from "./buySlippage.js";
import { getSeedPhrase } from "./db.js";
import { getPrivateKey } from "./db.js";
import { fetchUser, saveUser, addWalletToUser } from "./db.js";
import { generateNewWallet } from "./genNewWallet.js";
import { getBalance } from "./getBalance.js";
import { handleConnectWallet } from "./handleConnectWallet.js";
import { handleWallets } from "./handleWallets.js";
import { mainMenu } from "./mainMenu.js";
import { userSteps } from "./userState.js";
import { createWithdrawWalletKeyboard, isValidSuiAddress, sendSui } from "./withdrawSui.js";


const slippageSettings = {};

export async function handleAction(ctx, action) {
    const userId = ctx.from.id;
    switch (true) {
        case action === "/start":
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

        case "positions":
            return ctx.editMessageText("📊 Here are your current positions.");

        case "sniper":
            return ctx.editMessageText("🎯 Sniper mode activated!");

        case "referrals":
            return ctx.editMessageText("👥 You have 3 referrals.");

        case action === "config":
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
            // break;
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

        case action.startsWith("set_buy_slippage_"):
            const index = action.replace("set_buy_slippage_", "");

            await ctx.reply("📝 Enter the new buy slippage % (e.g. 1.5):");
            bot.once("text", async (msg) => {
                const slippage = parseFloat(msg.text);
                if (isNaN(slippage) || slippage <= 0 || slippage > 50) {
                    return ctx.reply("❌ Invalid slippage. Please enter a number between 0.1 and 50.");
                }

                await setBuySlippage(userId, slippage);
                await ctx.reply(`✅ Buy slippage updated to ${slippage}%`);

                // Optional: refresh the slippage screen
                await handleBuySlippage(ctx, userId);
            });
            break;


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

        case action === "sell_slippage":
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

        case action === "cancel":
            return ctx.editMessageText("❌ Action cancelled.");

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

        case action.startsWith("withdraw_sui_"): {
            const index = Number(action.split("_").pop());
            const userId = ctx.from.id.toString();

            userSteps[userId] = {
                state: "awaiting_withdraw_address",
                selectedWalletIndex: index,
            };

            const user = await fetchUser(userId);
            const selectedWallet = user.wallets[index];

            userSteps[userId].walletPrivateKey = selectedWallet.walletPrivateKey;
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
                hasPrivateKey: !!selectedWallet.walletPrivateKey,
                privateKeyType: selectedWallet.walletPrivateKey ? typeof selectedWallet.walletPrivateKey : "N/A"
            });

            // Get the wallet's private key - USE THE CORRECT PROPERTY NAME
            // It might be 'privateKey' instead of 'walletPrivateKey'
            const walletPrivateKey = selectedWallet.walletPrivateKey || selectedWallet.privateKey;

            if (!walletPrivateKey) {
                console.error("No private key found in the wallet");
                return ctx.reply("❌ Error: Could not find private key for the selected wallet.");
            }

            console.log(`Processing withdrawal: ${amount} SUI to ${withdrawAddress}`);

            // Send a processing message
            await ctx.reply("⏳ Processing your withdrawal request...");

            // Send the SUI transaction (replace with your own method)
            try {
                // if (!base64PrivateKey) {
                // console.error("Missing or invalid sender wallet:", base64PrivateKey);
                // return ctx.reply("❌ Could not find wallet private key for withdrawal.");
                // }
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
}  