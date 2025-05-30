import * as dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const blockberryApiKey = 'm6bO7zBpW5L0TQAZVCFGjM85L00Ebw';

export const getUserTokenDetails = async (address, token = '0x2::sui::SUI') => {
const options = {
        method: 'GET',
        url: 'https://api.blockberry.one/sui/v1/accounts/' + address + '/balance',
        headers: { accept: '*/*', 'x-api-key': blockberryApiKey }
    };

    try {
        const res = await axios.request(options);
        const coin_details = res.data.find((coin) => coin.coinType === token);
        return coin_details ? coin_details : null;
    } catch (error) {
        // console.error(error);
        return null;
    }
}



// (async () => {
//     const details = await getUserTokenDetails("0x48dfdd7c1acb1b4919e1b4248206af584bef882f126f1733521ac41eb13fb77b");
//     console.log(details);
// })();



//  if (step?.state === "awaiting_buy_token_address") {
//     const user = await getUser(userId);
//     const walletAddress = user?.walletAddress;

//     if (!walletAddress) {
//       return ctx.reply("❌ Please set your wallet address");
//     }

//     const tokenAddress = ctx.message.text?.trim();

//     if (!tokenAddress || !tokenAddress.includes("::")) {
//       return ctx.reply("❌ Invalid token address format.");
//     }
//     try {
//       const tokenInfo = await getTokenDetailsCetus(tokenAddress);
//       console.log('the token info', tokenInfo.data.name);
//     } catch (error) {
//       console.log(error)
//     }

//     try {
//       const tokenInfo = await getTokenDetails(tokenAddress, walletAddress);
//       // console.log('The token info', tokenInfo);
//       if (!tokenInfo) {
//         return ctx.reply("❌ Token not found or no liquidity.");
//       }

//       let token_balance = { balance: 0, balanceUsd: 0 };
//       let suiBalance = 0;
//       if (tokenInfo.data.quoteToken.symbol === "SUI") {
//         // Fetch token balance
//         token_balance = await getCoinBalance(walletAddress, tokenInfo.data.baseToken.address);
//         suiBalance = await getBalance(walletAddress);
//         // const suiBalance = 0;
//         const args = {
//           token_balance: token_balance,
//           token_name: tokenInfo?.data?.baseToken?.name,
//           token_symbol: tokenInfo?.data?.baseToken?.symbol,
//           chart: tokenInfo?.data?.url,
//           scan: `https://suiscan.xyz/mainnet/coin/${tokenInfo?.data.baseToken.address}/txs`,
//           ca: tokenInfo?.data?.baseToken?.address,
//         }
//       }
//       const formattedString = `
//           **CENTRON BOT⚡**!

//      📈 ${tokenInfo?.data.baseToken.name}
//      ${tokenInfo?.data.baseToken.symbol} / ${tokenInfo?.data.quoteToken.symbol}

//      🪙 CA: ${tokenInfo?.data.baseToken.address}
//     🔄 LP: ${tokenInfo?.data.dexId}

//     💵 Price (USD): $${tokenInfo?.data.priceUsd}
//     💱 Price : ${tokenInfo?.data.priceNative} ${tokenInfo?.data.quoteToken.symbol}

//     💧 Liquidity (USD): ${formatPrice(Number(tokenInfo?.data.liquidity.usd))}
//     📊 FDV: ${formatPrice(Number(tokenInfo?.data.fdv))}
//     🏦 Market Cap: ${formatPrice(Number(tokenInfo?.data.marketCap))}

//     📅 Created: ${new Date(tokenInfo?.data.pairCreatedAt).toLocaleString()}
//     ----------------------------------------------------------------
//     📬 Wallet Address: \`${walletAddress}\`
//     💰 Balance: ${suiBalance} SUI💧
//     💰 Balance: ${token_balance.balance} ${tokenInfo?.data.baseToken.symbol} | $${token_balance.balanceUsd}`;

//       // await bot.sendMessage(chatId, formattedString, { parse_mode: 'Markdown' });
//       await ctx.reply(formattedString, {
//             parse_mode: "HTML",
//             reply_markup: {
//               inline_keyboard: [
//                 [
//                   { text: "SuiScan", url: `https://suivision.xyz/token/tokenObjectId` },
//                   { text: "MovePump", url: "https://movepump.xyz" },
//                 ],
//                 [
//                   { text: "➕ Limit Order", callback_data: "limit_order" },
//                   { text: "📈 DCA Order", callback_data: "dca_order" },
//                 ],
//                 [{ text: "⚙️ Manage Orders", callback_data: "manage_orders" }],
//                 [{ text: "Buy ⬇️ Sell", callback_data: "buy_sell_toggle" }],
//                 [
//                   { text: "Buy 10 SUI", callback_data: `buy_10` },
//                   { text: "Buy 50 SUI", callback_data: `buy_50` },
//                 ],
//                 [
//                   { text: "Buy 100 SUI", callback_data: `buy_100` },
//                   { text: "Buy 200 SUI", callback_data: `buy_200` },
//                 ],
//               ],
//             },
//           });
//     } catch (error) {
//       console.error(error);
//       ctx.reply("❌ Failed to fetch token info. Please make sure the address is correct.");
//     }
//   }
