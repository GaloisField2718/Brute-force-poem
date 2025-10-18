"use strict";
/**
 * Worker thread for checking seed phrases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const address_generator_1 = require("../src/3-address-derivation/address-generator");
const api_router_1 = require("../src/4-balance-checker/api-router");
const config_1 = require("../src/utils/config");
// Initialize API router with error handling
let apiRouter = null;
try {
    const apiConfig = config_1.Config.loadApiConfig();
    apiRouter = new api_router_1.ApiRouter(apiConfig.endpoints);
}
catch (error) {
    console.error('Failed to initialize worker API router:', error);
    process.exit(1);
}
/**
 * Check a single seed phrase
 */
async function checkSeed(task) {
    const startTime = Date.now();
    if (!apiRouter) {
        return {
            found: false,
            mnemonic: task.mnemonic,
            totalAddressesChecked: 0,
            checkDuration: Date.now() - startTime
        };
    }
    try {
        // Validate mnemonic before processing
        if (!task.mnemonic || task.mnemonic.split(' ').length !== 12) {
            throw new Error('Invalid mnemonic: must be 12 words');
        }
        // Derive all 12 addresses
        const addresses = address_generator_1.AddressGenerator.deriveAllAddresses(task.mnemonic);
        if (!addresses || addresses.length === 0) {
            throw new Error('Failed to derive addresses');
        }
        // Check balance for each address
        for (const addr of addresses) {
            try {
                const balance = await apiRouter.checkBalance(addr.address);
                // Check if we found the target
                if (balance === config_1.Config.TARGET_BALANCE_SATS) {
                    const checkDuration = Date.now() - startTime;
                    return {
                        found: true,
                        mnemonic: task.mnemonic,
                        address: addr.address,
                        path: addr.path,
                        type: addr.type,
                        balance,
                        totalAddressesChecked: addresses.length,
                        checkDuration
                    };
                }
            }
            catch (apiError) {
                // Log API error but continue checking other addresses
                console.error(`API error for address ${addr.address}:`, apiError);
                continue;
            }
        }
        const checkDuration = Date.now() - startTime;
        return {
            found: false,
            mnemonic: task.mnemonic,
            totalAddressesChecked: addresses.length,
            checkDuration
        };
    }
    catch (error) {
        const checkDuration = Date.now() - startTime;
        console.error('Error checking seed:', error.message);
        return {
            found: false,
            mnemonic: task.mnemonic,
            totalAddressesChecked: 0,
            checkDuration
        };
    }
}
// Listen for messages from main thread
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', async (task) => {
        const result = await checkSeed(task);
        if (worker_threads_1.parentPort) {
            worker_threads_1.parentPort.postMessage(result);
        }
        // If found, exit worker
        if (result.found) {
            process.exit(0);
        }
    });
}
