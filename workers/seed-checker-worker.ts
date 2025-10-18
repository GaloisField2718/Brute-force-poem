/**
 * Worker thread for checking seed phrases
 */

import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
import { AddressGenerator } from '../src/3-address-derivation/address-generator';
import { ApiRouter } from '../src/4-balance-checker/api-router';
import { UnifiedBalanceChecker } from '../src/4-balance-checker/unified-balance-checker';
import { Config } from '../src/utils/config';
import { SeedCheckTask, SeedCheckResult } from '../src/types';

// Initialize balance checker (API Router or Unified)
let balanceChecker: ApiRouter | UnifiedBalanceChecker | null = null;

async function initializeBalanceChecker() {
  try {
    // Check if bitcoin-sources.json exists and has RPC/Electrum enabled
    const sourcesPath = Config.BITCOIN_SOURCES_PATH;
    
    if (fs.existsSync(sourcesPath)) {
      const sourcesConfig = Config.loadBitcoinSources();
      const hasAlternatives = sourcesConfig.sources.some((s: any) => 
        s.enabled && (s.type === 'bitcoin-rpc' || s.type === 'electrum')
      );
      
      if (hasAlternatives) {
        console.log('Worker: Using Unified Balance Checker (with RPC/Electrum)');
        const unified = new UnifiedBalanceChecker();
        await unified.initialize();
        balanceChecker = unified;
        return;
      }
    }
    
    // Default: Use API Router with public APIs
    console.log('Worker: Using API Router (public APIs)');
    const apiConfig = Config.loadApiConfig();
    balanceChecker = new ApiRouter(apiConfig.endpoints);
  } catch (error) {
    console.error('Failed to initialize worker balance checker:', error);
    process.exit(1);
  }
}

// Initialize on worker start
initializeBalanceChecker().catch(error => {
  console.error('Failed to initialize:', error);
  process.exit(1);
});

/**
 * Check a single seed phrase
 */
async function checkSeed(task: SeedCheckTask): Promise<SeedCheckResult> {
  const startTime = Date.now();
  
  if (!balanceChecker) {
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
        const balance = await balanceChecker.checkBalance(addr.address);
        
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
