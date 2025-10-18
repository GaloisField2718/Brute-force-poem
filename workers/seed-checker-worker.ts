/**
 * Worker thread for checking seed phrases
 */

import { parentPort, workerData } from 'worker_threads';
import { AddressGenerator } from '../src/3-address-derivation/address-generator';
import { ApiRouter } from '../src/4-balance-checker/api-router';
import { Config } from '../src/utils/config';
import { SeedCheckTask, SeedCheckResult } from '../src/types';

// Initialize API router with error handling
let apiRouter: ApiRouter | null = null;

try {
  const apiConfig = Config.loadApiConfig();
  apiRouter = new ApiRouter(apiConfig.endpoints);
} catch (error) {
  console.error('Failed to initialize worker API router:', error);
  process.exit(1);
}

/**
 * Check a single seed phrase
 */
async function checkSeed(task: SeedCheckTask): Promise<SeedCheckResult> {
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
    const addresses = AddressGenerator.deriveAllAddresses(task.mnemonic);
    
    if (!addresses || addresses.length === 0) {
      throw new Error('Failed to derive addresses');
    }
    
    // Check balance for each address
    for (const addr of addresses) {
      try {
        const balance = await apiRouter.checkBalance(addr.address);
        
        // Check if we found the target
        if (balance === Config.TARGET_BALANCE_SATS) {
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
      } catch (apiError) {
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
  } catch (error: any) {
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
if (parentPort) {
  parentPort.on('message', async (task: SeedCheckTask) => {
    const result = await checkSeed(task);
    
    if (parentPort) {
      parentPort.postMessage(result);
    }
    
    // If found, exit worker
    if (result.found) {
      process.exit(0);
    }
  });
}
