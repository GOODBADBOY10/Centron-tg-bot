import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import axios from "axios";

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
const SUI_RPC_URL = "https://fullnode.mainnet.sui.io:443";


export async function getBalance(address) {
    if (!address) throw new Error("No address provided to getBalance");
    
    try {
        const balanceResult = await suiClient.getBalance({ owner: address });
        return balanceResult.totalBalance;
    } catch (error) {
        console.error('Error fetching balance:', error);
        return null;
    }
}

// export async function getBalance(walletAddress) {
//     try {
//         const response = await axios.post(SUI_RPC_URL, {
//             jsonrpc: "2.0",
//             id: 1,
//             method: "suix_getBalance",
//             params: [
//                 walletAddress,
//                 "0x2::sui::SUI" // Specify SUI coin type
//             ],
//         });
//         // Check if result exists and has totalBalance
//         if (response.data && response.data.result && response.data.result.totalBalance) {
//             const suiBalance = response.data.result.totalBalance;
//             const formatted = (parseInt(suiBalance) / 1e9).toFixed(3); // Convert from MIST to SUI
//             return formatted; // e.g. "12.345"
//         } else {
//             console.error("Unexpected response structure:", response.data);
//             return "0.000";
//         }
//     } catch (error) {
//         console.error("Failed to fetch SUI balance:", error.message);
//         return "0.000"; // fallback on error
//     }
// }
