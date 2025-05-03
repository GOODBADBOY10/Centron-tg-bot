// // Sui Sniper Bot - Telegram Bot Implementation with Cetus Integration
// // Required packages:
// // npm install telegraf axios node-fetch dotenv

// require('dotenv').config();
// const { Telegraf, Markup } = require('telegraf');
// const axios = require('axios');
// const fetch = require('node-fetch');

// // Create a new bot instance
// const bot = new Telegraf(process.env.BOT_TOKEN);

// // Store user steps for multi-step operations
// const userSteps = {};

// // Initialize tokenCache to store fetched token data
// const tokenCache = {};

// // Cetus API endpoints
// const CETUS_API_BASE = process.env.CETUS_API_BASE || 'https://api.cetus.zone/v1';
// const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';

// // User wallets mapping (in production, use a database)
// const userWallets = {};

// // This function is now replaced by fetchTokenInfoFromCetus, but kept for backward compatibility
// async function fetchTokenInfo(tokenAddress) {
//     try {
//         // Try to use the more specific fetchTokenInfoFromCetus function
//         const cetusTokenInfo = await fetchTokenInfoFromCetus(tokenAddress);
//         if (cetusTokenInfo) {
//             return {
//                 ...cetusTokenInfo,
//                 // Format bonding as string for backward compatibility
//                 bonding: `${cetusTokenInfo.bonding}% (${cetusTokenInfo.bondedAmount}/${cetusTokenInfo.targetAmount} SUI)`
//             };
//         }
        
//         // Check if we have this token cached
//         if (tokenCache[tokenAddress]) {
//             return tokenCache[tokenAddress];
//         }
        
//         // Split the token address into parts if it contains :: delimiters
//         const addressParts = tokenAddress.split('::');
//         const contractAddress = addressParts[0];
//         const packageName = addressParts[1];
//         const tokenName = addressParts[2];
        
//         // If not found in Cetus, try to get basic info from Sui RPC
//         const suiResponse = await fetch(SUI_RPC_URL, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 jsonrpc: '2.0',
//                 id: 1,
//                 method: 'sui_getObject',
//                 params: [contractAddress, { showType: true, showContent: true }]
//             })
//         });
        
//         const suiData = await suiResponse.json();
        
//         if (suiData && suiData.result && suiData.result.data) {
//             // Extract basic token info from Sui
//             const objectData = suiData.result.data;
            
//             // Create a basic token record
//             const result = {
//                 name: tokenName || packageName || "Unknown Token",
//                 symbol: tokenName || "UNKNOWN",
//                 contractAddress: tokenAddress,
//                 decimals: 9, // Default for many Sui tokens
//                 price: 0,
//                 marketCap: 0,
//                 bonding: "0% (0/0 SUI)",
//                 logo: null
//             };
            
//             // Cache the result
//             tokenCache[tokenAddress] = result;
//             return result;
//         }
        
//         // If we can't find data anywhere, return a basic structure
//         return {
//             name: "Unknown Token",
//             symbol: tokenName || "UNKNOWN",
//             contractAddress: tokenAddress,
//             decimals: 9,
//             price: 0,
//             marketCap: 0,
//             bonding: "0% (0/0 SUI)",
//             logo: null
//         };
//     } catch (error) {
//         console.error('Error fetching token info:', error);
//         return {
//             name: "Error Fetching Token",
//             symbol: "ERROR",
//             contractAddress: tokenAddress,
//             decimals: 9,
//             price: 0,
//             marketCap: 0,
//             bonding: "N/A",
//             logo: null
//         };
//     }
// }

// // Helper function to fetch wallet balances
// async function fetchWalletBalance(walletAddress) {
//     try {
//         const response = await fetch(SUI_RPC_URL, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 jsonrpc: '2.0',
//                 id: 1,
//                 method: 'sui_getBalance',
//                 params: [walletAddress, '0x2::sui::SUI']
//             })
//         });
        
//         const data = await response.json();
        
//         if (data && data.result) {
//             return {
//                 sui: parseFloat(data.result.totalBalance) / 1000000000, // Convert from Mist to SUI
//                 tokens: {} // Can be expanded to include other tokens
//             };
//         }
        
//         return { sui: 0, tokens: {} };
//     } catch (error) {
//         console.error('Error fetching wallet balance:', error);
//         return { sui: 0, tokens: {} };
//     }
// }

// // Helper to format token display message
// async function formatTokenBuyMessage(token, walletAddress) {
//     // Format the contract address to show first and last parts if it's very long
//     const fullAddress = token.contractAddress;
//     const shortenedAddress = fullAddress.length > 30 ? 
//         `${fullAddress.substring(0, 15)}...${fullAddress.substring(fullAddress.length - 15)}` : 
//         fullAddress;
    
//     // Get wallet balance if available
//     let walletInfo = "No wallet connected";
//     if (walletAddress) {
//         const balance = await fetchWalletBalance(walletAddress);
//         walletInfo = `💳 ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)} | ${balance.sui.toFixed(2)} SUI`;
        
//         // Add token balance if available
//         if (balance.tokens[token.symbol]) {
//             const tokenBalance = balance.tokens[token.symbol];
//             const tokenValue = tokenBalance * token.price;
//             walletInfo += ` | ${tokenBalance} $${token.symbol} (worth ${(tokenValue / balance.sui).toFixed(2)} SUI / $${tokenValue.toFixed(2)})`;
//         } else {
//             walletInfo += ` | 0 $${token.symbol} (worth 0.00 SUI / $0.00)`;
//         }
//     }
    
//     // Create the main message content
//     let message = `Sui Sniper Bot\nReply to this message with token address that you want to buy:\n${fullAddress}\n\n`;
//     message += `${token.name} - $${token.symbol}\n\n`;
//     message += `CA - \n${fullAddress}\n\n`;
//     message += `💰 Price: $${token.price || 'Unknown'}\n`;
//     message += `💵 Market Cap: $${typeof token.marketCap === 'number' ? token.marketCap.toLocaleString() : 'Unknown'}\n`;
//     message += `📈 Bonding: ${token.bonding || 'Unknown'}\n\n`;
    
//     // Add wallet information
//     message += `Selected wallets:\n${walletInfo}\n\n`;
    
//     // Add bot link
//     const encodedAddress = encodeURIComponent(fullAddress.substring(0, 40));
//     const botLink = `https://t.me/SuiSniperBot?start=${encodedAddress}`;
//     message += botLink;
    
//     return message;
// }

// // Bot initialization
// bot.start((ctx) => {
//     ctx.reply('Welcome to Sui Sniper Bot! Use /connect to connect your wallet, or send me a token address to view its details.');
// });

// // Help command
// bot.help((ctx) => {
//     ctx.reply(`
// Available commands:
// /start - Start the bot
// /help - Show this help menu
// /connect - Connect your wallet
// /buy - Start token buying process
// /wallet - View your wallet details
//     `);
// });

// // Connect wallet command
// bot.command('connect', (ctx) => {
//     const userId = ctx.from.id;
//     userSteps[userId] = { state: 'awaiting_wallet_address' };
    
//     ctx.reply('Please enter your Sui wallet address to connect:', {
//         reply_markup: { force_reply: true }
//     });
// });

// // User database (in production, use a real database)
// const users = {};

// // Helper function to fetch user data
// async function fetchUser(userId) {
//     if (!users[userId]) {
//         users[userId] = {
//             id: userId,
//             walletAddress: null,
//             settings: {},
//             createdAt: new Date()
//         };
//     }
//     return users[userId];
// }

// // Helper function to get full coin type from object ID
// async function getFullCoinType(tokenObjectId) {
//     try {
//         // Try to get the object details from Sui RPC
//         const response = await fetch(SUI_RPC_URL, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 jsonrpc: '2.0',
//                 id: 1,
//                 method: 'sui_getObject',
//                 params: [tokenObjectId, { showType: true, showContent: true, showOwner: true }]
//             })
//         });
        
//         const data = await response.json();
        
//         if (data?.result?.data?.type) {
//             return data.result.data.type;
//         }
        
//         // If that doesn't work, try to find from Cetus API
//         const cetusResponse = await axios.get(`${CETUS_API_BASE}/token/`);
//         const cetusTokens = cetusResponse.data.data;
        
//         // Find token by address
//         const token = cetusTokens.find(t => 
//             t.address === tokenObjectId || 
//             t.address.startsWith(tokenObjectId)
//         );
        
//         if (token) {
//             return token.address;
//         }
        
//         return null;
//     } catch (error) {
//         console.error('Error getting full coin type:', error);
//         return null;
//     }
// }

// // Helper to extract symbol from type
// function extractSymbolFromType(fullCoinType) {
//     try {
//         // Format typically: 0x....::module::SYMBOL
//         const parts = fullCoinType.split('::');
//         if (parts.length >= 3) {
//             return parts[2];
//         }
//         return "UNKNOWN";
//     } catch (error) {
//         return "UNKNOWN";
//     }
// }

// // Helper to shorten addresses
// function shorten(address) {
//     if (!address) return '';
//     if (address.length < 15) return address;
//     return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
// }

// // Function to fetch token info from Cetus
// async function fetchTokenInfoFromCetus(tokenObjectId) {
//     try {
//         // First check cache
//         if (tokenCache[tokenObjectId]) {
//             return tokenCache[tokenObjectId];
//         }
        
//         // Get from Cetus API
//         const cetusResponse = await axios.get(`${CETUS_API_BASE}/token/`);
//         const cetusTokens = cetusResponse.data.data;
        
//         // Find token by address
//         const tokenData = cetusTokens.find(token => 
//             token.address === tokenObjectId || 
//             token.address.startsWith(tokenObjectId)
//         );
        
//         if (tokenData) {
//             // Format data consistently
//             const result = {
//                 name: tokenData.name,
//                 symbol: tokenData.symbol,
//                 contractAddress: tokenData.address,
//                 decimals: tokenData.decimals,
//                 price: tokenData.price || 0,
//                 marketCap: tokenData.marketCap || 0,
//                 bonding: tokenData.bonding || 0,
//                 bondedAmount: tokenData.bondedAmount || 0,
//                 targetAmount: tokenData.targetAmount || 0,
//                 logo: tokenData.logo || null
//             };
            
//             // Cache the result
//             tokenCache[tokenObjectId] = result;
//             return result;
//         }
        
//         return null;
//     } catch (error) {
//         console.error('Error fetching token info from Cetus:', error);
//         return null;
//     }
// }

// // Function to get wallet balance including token balance
// async function getWalletWithTokenBalance(walletAddress, tokenType) {
//     try {
//         // First get SUI balance
//         const suiResponse = await fetch(SUI_RPC_URL, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//                 jsonrpc: '2.0',
//                 id: 1,
//                 method: 'sui_getBalance',
//                 params: [walletAddress, '0x2::sui::SUI']
//             })
//         });
        
//         const suiData = await suiResponse.json();
//         const suiBalance = suiData?.result?.totalBalance 
//             ? parseFloat(suiData.result.totalBalance) / 1000000000 // Convert from Mist to SUI
//             : 0;
        
//         // Then get token balance if we have a token type
//         let tokenBalance = 0;
//         if (tokenType) {
//             try {
//                 const tokenResponse = await fetch(SUI_RPC_URL, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         jsonrpc: '2.0',
//                         id: 1,
//                         method: 'sui_getBalance',
//                         params: [walletAddress, tokenType]
//                     })
//                 });
                
//                 const tokenData = await tokenResponse.json();
//                 if (tokenData?.result?.totalBalance) {
//                     // Need to adjust decimals based on token
//                     const decimals = tokenCache[tokenType]?.decimals || 9;
//                     tokenBalance = parseFloat(tokenData.result.totalBalance) / Math.pow(10, decimals);
//                 }
//             } catch (error) {
//                 console.error('Error getting token balance:', error);
//             }
//         }
        
//         return {
//             sui: suiBalance.toFixed(4),
//             token: tokenBalance.toFixed(6)
//         };
//     } catch (error) {
//         console.error('Error getting wallet balances:', error);
//         return { sui: '0.0000', token: '0.000000' };
//     }
// }

// // Handle wallet address input
// bot.on('text', async (ctx) => {
//     const userId = ctx.from.id;
//     const userInput = ctx.message.text;
    
//     // Check if we're waiting for specific input from this user
//     if (userSteps[userId]) {
//         const session = userSteps[userId];
//         const user = await fetchUser(userId);
        
//         if (session?.state === 'awaiting_wallet_address') {
//             // Validate wallet address (basic validation)
//             if (userInput.startsWith('0x') && userInput.length >= 42) {
//                 // Save wallet to user
//                 user.walletAddress = userInput;
                
//                 // Clear the user step
//                 delete userSteps[userId];
                
//                 return ctx.reply(`✅ Wallet connected successfully!\nAddress: <code>${userInput}</code>`, {
//                     parse_mode: 'HTML'
//                 });
//             } else {
//                 return ctx.reply('❌ Invalid wallet address. Please enter a valid Sui wallet address starting with 0x:', {
//                     reply_markup: { force_reply: true }
//                 });
//             }
//         } else if (session?.state === 'awaiting_buy_token_address' || session?.state === 'awaiting_token_address') {
//             // Process token address for buying
//             try {
//                 const tokenObjectId = userInput.trim();
                
//                 // Clear the user step
//                 delete userSteps[userId];
                
//                 // Validate token address format (basic validation)
//                 if (!tokenObjectId.startsWith('0x')) {
//                     return ctx.reply('❌ Invalid token address. Please enter a valid token address starting with 0x:', {
//                         reply_markup: { force_reply: true }
//                     });
//                 }
                
//                 // Show loading message
//                 const loadingMsg = await ctx.reply('⏳ Fetching token information...');
                
//                 // Get full coin type
//                 const fullCoinType = await getFullCoinType(tokenObjectId);
//                 if (!fullCoinType) {
//                     await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
//                     return ctx.reply("❌ Couldn't detect full token type from this object ID.");
//                 }
                
//                 // Fetch token info from Cetus
//                 const tokenInfo = await fetchTokenInfoFromCetus(tokenObjectId);
//                 if (!tokenInfo) {
//                     await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
//                     return ctx.reply("❌ Failed to fetch token info from Cetus.");
//                 }
                
//                 // Get wallet balances
//                 const balances = await getWalletWithTokenBalance(user.walletAddress, fullCoinType);
//                 const tokenSymbol = extractSymbolFromType(fullCoinType);
                
//                 // Delete loading message
//                 await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
                
//                 // Format message
//                 const message = `🟢 <b>${tokenInfo.name} - ${tokenInfo.symbol}</b>\n\n` +
//                     `CA - <code>${tokenObjectId}</code>\n\n` +
//                     `💰 Price: ${tokenInfo.price}\n` +
//                     `📊 Market Cap: ${tokenInfo.marketCap}\n` +
//                     `🔗 Bonding: ${tokenInfo.bonding}% (${tokenInfo.bondedAmount}/${tokenInfo.targetAmount} SUI)\n\n` +
//                     `👛 <b>Wallet:</b>\n` +
//                     `• <code>${shorten(user.walletAddress)}</code> | ${balances.sui} SUI | ${balances.token} ${tokenSymbol}`;
                
//                 // Send the message with action buttons
//                 return ctx.reply(message, {
//                     parse_mode: 'HTML',
//                     reply_markup: {
//                         inline_keyboard: [
//                             [
//                                 { text: "SuiScan", url: `https://suivision.xyz/token/${tokenObjectId}` },
//                                 { text: "MovePump", url: "https://movepump.xyz" },
//                             ],
//                             [
//                                 { text: "➕ Limit Order", callback_data: "limit_order" },
//                                 { text: "📈 DCA Order", callback_data: "dca_order" },
//                             ],
//                             [{ text: "⚙️ Manage Orders", callback_data: "manage_orders" }],
//                             [{ text: "Buy ⬇️ Sell", callback_data: "buy_sell_toggle" }],
//                             [
//                                 { text: "Buy 10 SUI", callback_data: `buy_10` },
//                                 { text: "Buy 50 SUI", callback_data: `buy_50` },
//                             ],
//                             [
//                                 { text: "Buy 100 SUI", callback_data: `buy_100` },
//                                 { text: "Buy 200 SUI", callback_data: `buy_200` },
//                             ],
//                         ]
//                     }
//                 });
//             } catch (error) {
//                 console.error('Error processing token address:', error);
//                 return ctx.reply('❌ Error processing token address. Please try again with a valid token address.');
//             }
//         }
//     } else {
//         // If the input looks like a token address but we're not in any specific state
//         if (userInput.startsWith('0x')) {
//             // Show loading message
//             const loadingMsg = await ctx.reply('⏳ Fetching token information...');
            
//             try {
//                 // Fetch token information
//                 const tokenInfo = await fetchTokenInfo(userInput);
                
//                 // Delete loading message
//                 await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
                
//                 // Get user's wallet if connected
//                 const walletAddress = userWallets[userId];
                
//                 // Format and send token message
//                 const message = await formatTokenBuyMessage(tokenInfo, walletAddress);
                
//                 // Send the message with action buttons
//                 return ctx.reply(message, {
//                     parse_mode: 'Markdown',
//                     reply_markup: {
//                         inline_keyboard: [
//                             [
//                                 { text: '📄 SuiScan', url: `https://suiscan.xyz/mainnet/object/${tokenInfo.contractAddress.split('::')[0]}` },
//                                 { text: '💧 MovePump', url: `https://app.movepump.com/swap?input=0x2::sui::SUI&output=${encodeURIComponent(tokenInfo.contractAddress)}` }
//                             ],
//                             [
//                                 { text: '➕ Limit Order', callback_data: `limit_${tokenInfo.contractAddress}` },
//                                 { text: '➕ DCA Order', callback_data: `dca_${tokenInfo.contractAddress}` }
//                             ],
//                             [
//                                 { text: '⚙️ Manage Orders', callback_data: 'manage_orders' }
//                             ]
//                         ]
//                     }
//                 });
//             } catch (error) {
//                 console.error('Error fetching token info:', error);
                
//                 // Delete loading message
//                 await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
                
//                 return ctx.reply('❌ Error fetching token information. Please try again with a valid token address.');
//             }
//         }
//     }
// });

// // Handle buy command
// bot.command('buy', (ctx) => {
//     const userId = ctx.from.id;
//     userSteps[userId] = { state: "awaiting_buy_token_address" };
//     return ctx.reply("🛒 You're about to buy a token.\nPlease enter the token address below:", {
//         parse_mode: "Markdown",
//         reply_markup: {
//             force_reply: true,
//         },
//     });
// });

// // Handle wallet command
// bot.command('wallet', async (ctx) => {
//     const userId = ctx.from.id;
//     const walletAddress = userWallets[userId];
    
//     if (!walletAddress) {
//         return ctx.reply('❌ No wallet connected. Use /connect to connect your wallet first.');
//     }
    
//     // Show loading message
//     const loadingMsg = await ctx.reply('⏳ Fetching wallet information...');
    
//     try {
//         const balance = await fetchWalletBalance(walletAddress);
        
//         // Delete loading message
//         await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        
//         let message = `Wallet: \`${walletAddress}\`\n\n`;
//         message += `SUI Balance: ${balance.sui.toFixed(4)} SUI\n\n`;
//         message += `Tokens:\n`;
        
//         if (Object.keys(balance.tokens).length === 0) {
//             message += 'No tokens in wallet';
//         } else {
//             for (const [symbol, amount] of Object.entries(balance.tokens)) {
//                 const tokenInfo = tokenCache[symbol] || { price: 0 };
//                 const usdValue = amount * (tokenInfo.price || 0);
//                 message += `${amount} ${symbol} (~ $${usdValue.toFixed(2)})\n`;
//             }
//         }
        
//         return ctx.reply(message, { parse_mode: 'Markdown' });
//     } catch (error) {
//         console.error('Error fetching wallet information:', error);
        
//         // Delete loading message
//         await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        
//         return ctx.reply('❌ Error fetching wallet information. Please try again later.');
//     }
// });

// // Handle limit order button
// bot.action("limit_order", (ctx) => {
//     ctx.answerCbQuery();
//     ctx.reply(`📊 Setting up limit order.\n\nThis feature is currently in development. Please check back soon!`);
// });

// // Handle DCA order button
// bot.action("dca_order", (ctx) => {
//     ctx.answerCbQuery();
//     ctx.reply(`📈 Setting up DCA (Dollar Cost Average) order.\n\nThis feature is currently in development. Please check back soon!`);
// });

// // Handle manage orders button
// bot.action('manage_orders', (ctx) => {
//     ctx.answerCbQuery();
//     ctx.reply('⚙️ Managing your orders.\n\nThis feature is currently in development. Please check back soon!');
// });

// // Handle buy/sell toggle
// bot.action('buy_sell_toggle', (ctx) => {
//     ctx.answerCbQuery();
//     ctx.reply('Switched to sell mode. You can now set sell amounts.\n\nThis feature is currently in development.');
// });

// // Handle buy buttons
// bot.action(/buy_(\d+)/, async (ctx) => {
//     const amount = parseInt(ctx.match[1]);
//     ctx.answerCbQuery();
    
//     // Get user ID
//     const userId = ctx.from.id;
//     const user = await fetchUser(userId);
    
//     if (!user.walletAddress) {
//         return ctx.reply('❌ You need to connect a wallet first. Use /connect to connect your wallet.');
//     }
    
//     // Show a confirmation message
//     return ctx.reply(`🔄 Processing buy order for ${amount} SUI...\n\nThis is a simulation as the feature is in development.`);
// });

// // Handle Cetus swap
// async function performCetusSwap(userId, tokenAddress, amount) {
//     // This is a placeholder for actual Cetus API integration
//     // In a real implementation, you would:
//     // 1. Prepare the swap transaction
//     // 2. Sign it with the user's wallet (or provide signing instructions)
//     // 3. Submit the transaction to the network
    
//     // For now, we'll just simulate a response
//     return {
//         success: true,
//         txId: '0x' + Math.random().toString(16).substring(2, 34),
//         amountIn: amount,
//         amountOut: amount * 0.98, // Simulated slippage and fees
//         tokenAddress
//     };
// }

// // Launch the bot
// bot.launch().then(() => {
//     console.log('Sui Sniper Bot is running!');
// }).catch((err) => {
//     console.error('Failed to start bot:', err);
// });

// // Enable graceful stop
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));