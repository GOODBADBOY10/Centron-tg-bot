import { getUser, saveUser, addWalletToUser, incrementReferrer } from "./db.js";
import { generateWallet } from "./generateWallet.js";

export async function handleStart(ctx) {
    const userId = ctx.from.id.toString();
    const payload = ctx.startPayload;
    const user = await getUser(userId, payload);

    if (payload?.startsWith("ref_")) {
        const referrerId = payload.replace("ref_", "");
        await incrementReferrer(referrerId);
    }

    const referralLink = `https://t.me/${ctx.me}?start=ref_${userId}`;

    if (!user.wallets || user.wallets.length === 0) {
        const wallet = await generateWallet();
        await addWalletToUser(userId, wallet);
        await saveUser(userId, {
            walletAddress: wallet.walletAddress,
            seedPhrase: wallet.seedPhrase,
            privateKey: wallet.privateKey,
            createdAt: new Date().toISOString(),
        });

        await ctx.replyWithHTML(`
            🚀 <b>Wallet Generated!</b>
            📌 <b>Address:</b> <code>${wallet.walletAddress}</code>
            📌 <b>Seed Phrase:</b> <code>${wallet.seedPhrase}</code>
            🔐 <b>Private Key:</b> <code>${wallet.privateKey}</code>

            ⚠️ <i>Save your private key securely!</i>
        `);
    } else {
        await ctx.replyWithHTML(`
            Welcome to <b>Centron Bot</b>

            Trade tokens on SUI with the fastest trading bot. <b>All DEXes + MovePump</b> are supported.

            🔽 Invite friends and <b>earn up to 35% of their trading fees</b> with our 5-layered referral system!
            <code>${referralLink}</code>
        `, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📸 QR Code", callback_data: "show_qr" },
                        { text: "❌ Close", callback_data: "close" },
                    ],
                ],
            },
        });
    }

    await ctx.reply("Press 'Continue' to proceed:", {
        reply_markup: {
            keyboard: [[{ text: "➡️ Continue" }]],
            resize_keyboard: true,
        },
    });
};
