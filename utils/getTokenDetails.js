import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { getUserTokenDetails } from './getCoinDetails.js';
import { getBalance } from '../controllers/lib/getBalance.js';

const client = new SuiClient({
    url: getFullnodeUrl('mainnet'),
});

async function fetchWithRetry(client, tokenAddress, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
    //   const metadata = await client.getCoinMetadata({ coinType: tokenAddress });
      const metadata = await client.getCoinMetadata({ coinType });
      return metadata;
    } catch (e) {
      console.warn(`Metadata fetch failed (attempt ${i + 1}):`, e.message);
      console.warn(`Metadata fetch failed (attempt ${i + 1}):`, e.message);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
    }
  }
}


export async function getTokensInWallet(walletAddress) {
  const tokens = [];

  const coinTypes = await client.getAllBalances({ owner: walletAddress });
//   console.log('Coin types', coinTypes);

  for (const coin of coinTypes) {
    const { coinType, totalBalance } = coin;
    // console.log('coinssss', coinType);
    // console.log('coinssss-------', coin);

    if (BigInt(totalBalance) === 0n) continue;

    try {
      const metadata = await client.getCoinMetadata({ coinType: coin.coinType });
    //   const metadata = await await fetchWithRetry(client, tokenAddress);;
    //   console.log('Metadata', metadata);

      tokens.push({
        tokenAddress: coinType,
        symbol: metadata?.symbol || "???",
        decimals: metadata?.decimals || 0,
        balance: totalBalance,
      });
    } catch (err) {
      console.error("❌ Error fetching token metadata for", coinType, err);
    }
  }

  return tokens;
}

export function formatPrice(price) {
    if (price >= 1_000_000_000) {
        return `$${(price / 1_000_000_000).toFixed(1)}B`;
    } else if (price >= 1_000_000) {
        return `$${(price / 1_000_000).toFixed(1)}M`;
    } else if (price >= 1_000) {
        return `$${(price / 1_000).toFixed(1)}K`;
    }
    return `$${price}`;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getTokenDetails = async (token, walletAddress) => {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, {
        method: 'GET',
        headers: {},
    });
    // console.log(response);
    const responseData = await response.json();
    if (!responseData.pairs || !Array.isArray(responseData.pairs) || responseData.pairs.length === 0) {
        console.warn("⚠️ No pairs found in response for token:", token);
        return null;
    }
    const data = responseData.pairs[0];
    // console.log(data);
    return normalizeTokenData(data, "Dexscreener");
}

export const getInsidexTokenDetails = async (token, walletAddress) => {
    var myHeaders = new Headers();
    myHeaders.append("x-api-key", "insidex_api.SjjsPOLaLq2ksGIErxpbKMUC");
    var requestOptions = {
        method: 'GET',
        headers: myHeaders,
        redirect: 'follow'
    };
    try {
        const response = await fetch(`https://api-ex.insidex.trade/coins/${token}/market-data`, requestOptions);
        // console.log('response', response);
        const data = await response.json();
        // console.log('data from the real', data);
        // if (!data?.tokenAddress) throw new Error("Token not found");
        const normalizedData = data.map((item) => normalizeTokenData(item, "Insidex"));
        // console.log('nomalized', normalizedData);
        return normalizedData;
    } catch (error) {
        console.error("❌ Fetch error:", error.message);
    }
}

export const getTokenPriceSui = async (token) => {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, {
        method: 'GET',
        headers: {},
    });
    const responseData = await response.json();
    const data = responseData.pairs[0];
    return Number(data.priceNative)
    // return data.priceUsd
}

export const getCoinBalance = async (address, coinType = '0x2::sui::SUI') => {
    const details = await getUserTokenDetails(address, coinType)
    if (details === null) {
        return ({ balance: 0, balanceUsd: 0, decimals: 0 });
    } else {
        return ({ balance: details.balance, balanceUsd: details.balanceUsd, decimals: details.decimals });
    }
}


export function normalizeTokenData(data, source) {
    if (source === "Insidex") {
        return {
            name: data.coin || null,
            symbol: data.coinMetadata.symbol || null,
            address: data.coin || null,
            marketCap: data.marketCap || null,
            price: data.coinPrice ?? null,
            decimals: data.coinMetadata.decimals ?? null,
            date: data.coinMetadata.createdAt || null,
            source: "InsideX"
        };
    } else if (source === "Dexscreener") {
        return {
            name: data.baseToken.name || null,
            symbol: data.baseToken.symbol || null,
            address: data.baseToken.address || null,
            marketCap: data.marketCap || null,
            price: data.priceUsd ?? null,
            decimals: data.quoteToken.symbol || null,
            date: data.pairCreatedAt || null,
            source: "Dexscreener"
        };
    }
    return null;
}


// export const getSuiBalance = async (address) => {
//     try {
//         const balance = await client.getBalance({
//             owner: address,
//         });
//         return Number(balance.totalBalance) / 10 ** 9;
//     } catch (error) {
//         console.error(error);
//         return 0;
//     }

// }

// console.log(await getTokenDetails("0x457b032746c225d35489e3c260349125245656d44d1f048f2370d5edf4a66851::gus::GUS", "0x48dfdd7c1acb1b4919e1b4248206af584bef882f126f1733521ac41eb13fb77b"))
// console.log(await getCoinBalance("0x48dfdd7c1acb1b4919e1b4248206af584bef882f126f1733521ac41eb13fb77b", "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"))

// ${formattedSocials}
// 🌐 ${formattedWebsites}



// async function getFallbackTokenDetails(tokenAddress, walletAddress) {
//   try {
//     const tokenInfo = await getInsidexTokenDetails(tokenAddress);
//     if (tokenInfo?.data) {
//       // console.log('Token info from Cetus:', tokenInfo.data, tokenInfo);
//       return { tokenInfo, source: 'cetus' };
//     }
//   } catch (err) {
//     console.log('Cetus failed:', err.message || err);
//   }

//   try {
//     const tokenInfo = await getTokenDetails(tokenAddress, walletAddress);
//     if (tokenInfo?.data?.baseToken?.name) {
//       // console.log('Token info from fallback:', tokenInfo.data);
//       return { tokenInfo, source: 'fallback' };
//     }
//   } catch (err) {
//     console.log('Fallback failed:', err.message || err);
//   }

//   return null;
// }