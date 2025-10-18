/**
 * Worker thread for checking seed phrases
 */

import { parentPort, workerData } from 'worker_threads';
import { AddressGenerator } from '../src/3-address-derivation/address-generator';
import { ApiRouter } from '../src/4-balance-checker/api-router';
import { Config } from '../src/utils/config';
import { SeedCheckTask, SeedCheckResult } from '../src/types';

// Initialize API router
const apiConfig = Config.loadApiConfig();
const apiRouter = new ApiRouter(apiConfig.endpoints);

/**
 * Check a single seed phrase
 */
async function checkSeed(task: SeedCheckTask): Promise<SeedCheckResult> {
  const startTime = Date.now();
  
  try {
    // Derive all 12 addresses
    const addresses = AddressGenerator.deriveAllAddresses(task.mnemonic);
    
    // Check balance for each address
    for (const addr of addresses) {
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
