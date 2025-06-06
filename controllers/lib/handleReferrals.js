import { getUser } from "./db.js";

export async function handleReferrals(ctx, userId) {
    const user = await getUser(userId.toString());

    if (!user) {
       return ctx.reply("User not found. Please start with /start.");
    }

    const referralLink = `https://t.me/${ctx.me}?start=ref_${userId}`;
    const referralCount = user.referredCount || 0;
    const referralEarnings = user.referralEarnings || 0;

    return ctx.replyWithHTML(
        `
🎁 <b>Your Referral Dashboard</b>

🔗 <b>Referral Link:</b>
<code>${referralLink}</code>

👥 <b>Users Referred:</b> ${referralCount}
💸 <b>Earnings:</b> $${referralEarnings.toFixed(2)} SUI

✅ Share your link with friends and earn up to 35% of their trading fees!
    `.trim(),
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📎 QR Code", callback_data: "show_qr" },
                        { text: "❌ Close", callback_data: "close_msg" }
                    ]
                ]
            }
        }
    );
}
