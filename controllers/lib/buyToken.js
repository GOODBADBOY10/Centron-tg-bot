// cetusTokenService.js
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const client = new SuiClient({
    url: getFullnodeUrl('mainnet'),
});

/**
 * Initialize the Cetus SDK with proper configuration
 * @param {string} network - 'mainnet' or 'testnet'
 * @returns {Promise<CetusClmmSDK>} - Initialized Cetus SDK instance
 */
export const getCetusSDK = async (network = 'mainnet') => {
  // Initialize SDK using the simplified method from the official package
  const sdk = initCetusSDK({ network });
  
  // Refresh pool data to ensure we have the latest information
//   await sdk.Pool.getPoolImmutables();
  
  return sdk;
};

export const getTokenDetailsCetus = async (tokenAddress) => {
  try {
    // Initialize SDK using the simplified method
    const sdk = await getCetusSDK('mainnet');
    
    // Get all pools
    const pools = await sdk.Pool.getPoolsWithPage([], { limit: 100, offset: 0});
    
    // Find pools containing the target token
    const relevantPools = pools.filter(pool => 
      pool.coinTypeA === tokenAddress || 
      pool.coinTypeB === tokenAddress
    );
    console.log('relevant',relevantPools);
    
    if (relevantPools.length === 0) {
      console.warn(`⚠️ No pools found on Cetus for token: ${tokenAddress}`);
      return {
        success: false,
        token: tokenAddress,
        message: "No liquidity pools found for this token on Cetus"
      };
    }
    
    // // Get token metadata - using Coin module in the updated SDK
    const isTokenA = relevantPools[0].coinTypeA === tokenAddress;
    const tokenType = isTokenA ? relevantPools[0].coinTypeA : relevantPools[0].coinTypeB;
    console.log('token type', tokenType);
    const tokenMetadata = await client.getCoinMetadata({coinType: tokenType});
    console.log('token metatdata', tokenMetadata);
    if (!tokenMetadata) {
      console.warn(`⚠️ No metadata found for token: ${tokenAddress}`);
      return { success: false, token: tokenAddress, message: "Token metadata not available" };
    }
    // Format pool information
    const poolsInfo = await Promise.all(relevantPools.map(async (pool) => {
      const isTokenA = pool.coinTypeA === tokenAddress;
      const pairTokenType = isTokenA ? pool.coinTypeB : pool.coinTypeA;
      const pairTokenData = await client.getCoinMetadata({coinType: pairTokenType});
      
      return {
        poolAddress: pool.address,
        pairWith: pairTokenData?.symbol || 'Unknown',
        pairTokenAddress: pairTokenType,
        fee: parseFloat((pool.fee_rate / 10000).toFixed(2)), // Convert to percentage
        liquidity: parseFloat(pool.tvl || '0'),
        volume24h: parseFloat(pool.volume_24h || '0'),
        price: isTokenA 
          ? parseFloat(pool.price_b_per_a || '0') 
          : parseFloat(pool.price_a_per_b || '0')
      };
    }));
    
    // // // Calculate average price across all pools (weighted by liquidity)
    let totalLiquidity = 0;
    let weightedPriceSum = 0;
    
    poolsInfo.forEach(pool => {
      if (!isNaN(pool.liquidity) && !isNaN(pool.price)) {
        totalLiquidity += pool.liquidity;
        weightedPriceSum += pool.price * pool.liquidity;
      }
    });
    
    const averagePrice = totalLiquidity > 0 
      ? weightedPriceSum / totalLiquidity 
      : null;
    
    // // Return comprehensive token information
    return {
      success: true,
      token: tokenAddress,
      source: "cetus",
      data: {
        symbol: tokenMetadata.symbol,
        name: tokenMetadata.name,
        decimals: tokenMetadata.decimals,
        iconUrl: tokenMetadata.iconUrl || null,
        price: averagePrice,
        pools: poolsInfo,
        volume: volume24h,
        totalLiquidity: totalLiquidity,
        largestPool: poolsInfo.reduce((max, pool) => 
          (!isNaN(pool.liquidity) && pool.liquidity > max.liquidity) ? pool : max, 
          { liquidity: 0 }
        )
      }
    };
} catch (error) {
    console.error(`Error fetching data from Cetus SDK for token: ${tokenAddress}`, error);
    return {
      success: false,
      token: tokenAddress,
      message: "Failed to fetch data from Cetus SDK",
      error: error.message
    };
  }
};

/**
 * Get price of a token in terms of SUI or USDC
 * @param {string} tokenAddress - Full token address
 * @param {string} quoteToken - 'SUI' or 'USDC'
 * @returns {Promise<Object>} - Price information
 */
// export const getTokenPrice = async (tokenAddress, quoteToken = 'SUI') => {
//   try {
//     const sdk = await getCetusSDK('mainnet');
    
//     // Define quote token address
//     const quoteTokenAddress = quoteToken === 'USDC' 
//       ? '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN' // USDC
//       : '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'; // SUI
    
//     // Get route for the swap to calculate price
//     const amount = '1000000000'; // Use a fixed amount for price calculation
//     const slippage = 1; // 1% slippage
    
//     const routes = await sdk.Swap.calculatorRoutes({
//       fromCoin: tokenAddress,
//       toCoin: quoteTokenAddress,
//       amount,
//       slippage,
//       mode: 'ExactIn' // We're inputting an exact amount of the token
//     });
    
//     if (!routes || routes.length === 0) {
//       return {
//         success: false,
//         token: tokenAddress,
//         message: `No route found to calculate price in ${quoteToken}`
//       };
//     }
    
//     // Get the best route
//     const bestRoute = routes[0];
    
//     // Calculate price from input amount and expected output amount
//     const inputAmount = parseFloat(amount) / Math.pow(10, bestRoute.fromCoinDecimals);
//     const outputAmount = parseFloat(bestRoute.amount) / Math.pow(10, bestRoute.toCoinDecimals);
//     const price = outputAmount / inputAmount;
    
//     return {
//       success: true,
//       token: tokenAddress,
//       source: "cetus",
//       data: {
//         price: price,
//         quoteToken: quoteToken,
//         priceImpact: bestRoute.priceImpact.toFixed(4) + '%',
//         route: bestRoute.routeInfo?.pools?.map(pool => pool.poolAddress.substring(0, 10) + '...').join(' → ') || 'Direct'
//       }
//     };
//   } catch (error) {
//     console.error(`Error fetching price from Cetus for token: ${tokenAddress}`, error);
//     return {
//       success: false,
//       token: tokenAddress,
//       message: `Failed to get price in ${quoteToken}`,
//       error: error.message
//     };
//   }
// };

/**
 * Check if a token exists and has liquidity on Cetus
 * @param {string} tokenAddress - Full token address
 * @returns {Promise<boolean>} - Whether the token has liquidity
 */
// export const checkTokenLiquidityCetus = async (tokenAddress) => {
//   try {
//     // Initialize SDK with the simplified method
//     const sdk = await getCetusSDK('mainnet');
    
//     // Get all pools
//     const pools = await sdk.Pool.getPools();
    
//     // Check if any pool contains the token
//     const hasLiquidity = pools.some(pool => 
//       pool.coinTypeA === tokenAddress || 
//       pool.coinTypeB === tokenAddress
//     );
    
//     return hasLiquidity;
//   } catch (error) {
//     console.error(`Error checking liquidity for token: ${tokenAddress}`, error);
//     return false;
//   }
// };

/**
 * Integrated function to get token details from multiple sources
 * First tries DexScreener, then falls back to Cetus if needed
 * @param {string} tokenAddress - Full token address
 * @returns {Promise<Object>} - Consolidated token information
 */
// Example usage
// const tokenInfo = await getTokenDetailsCetus('0x48d0c671cc461a9fc73f35db02556b1bb7f634af02292a7e07504b2fa5c13383::lumi::LUMI');
// console.log(tokenInfo);