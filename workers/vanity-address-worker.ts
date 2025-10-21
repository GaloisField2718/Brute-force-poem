/**
 * Worker thread for generating vanity addresses
 */

import { parentPort, workerData } from 'worker_threads';
import { RandomSeedGenerator } from '../src/2-seed-generator/random-seed-generator';
import { VanityAddressGenerator } from '../src/3-address-derivation/vanity-address-generator';
import { logger } from '../src/utils/logger';

interface VanityWorkerTask {
  targetSuffix: string;
  maxSeedsToTry?: number;
}

interface VanityWorkerResult {
  found: boolean;
  mnemonic?: string;
  address?: string;
  path?: string;
  privateKey?: string;
  totalSeedsTried: number;
  totalAddressesChecked: number;
  duration: number;
}

/**
 * Generate vanity addresses for a specific pattern
 */
async function generateVanityAddress(task: VanityWorkerTask): Promise<VanityWorkerResult> {
  const startTime = Date.now();
  let totalSeedsTried = 0;
  let totalAddressesChecked = 0;
  const maxSeeds = task.maxSeedsToTry || 1000; // Default limit

  logger.info('Worker: Starting Taproot vanity address generation', {
    targetSuffix: task.targetSuffix,
    addressType: 'taproot',
    maxSeeds
  });

  try {
    while (totalSeedsTried < maxSeeds) {
      // Generate random seed
      const seedResult = RandomSeedGenerator.generateRandomSeed();
      totalSeedsTried++;

      logger.debug('Worker: Generated seed', {
        seedNumber: totalSeedsTried,
        mnemonic: seedResult.mnemonic.substring(0, 20) + '...'
      });

      // Try to find Taproot vanity address with this seed
      const result = await VanityAddressGenerator.generateForPattern(
        seedResult.mnemonic,
        task.targetSuffix
      );

      totalAddressesChecked += result.totalAddressesChecked;

      if (result.found) {
        const duration = Date.now() - startTime;
        
        logger.info('🎯 TAPROOT VANITY ADDRESS FOUND!', {
          address: result.address,
          path: result.path,
          suffix: task.targetSuffix,
          totalSeedsTried,
          totalAddressesChecked,
          duration: `${duration}ms`
        });

        return {
          found: true,
          mnemonic: result.mnemonic,
          address: result.address,
          path: result.path,
          privateKey: result.privateKey,
          totalSeedsTried,
          totalAddressesChecked,
          duration
        };
      }

      // Log progress every 10 seeds
      if (totalSeedsTried % 10 === 0) {
        logger.debug('Worker: Progress update', {
          totalSeedsTried,
          totalAddressesChecked,
          currentSeed: seedResult.mnemonic.substring(0, 20) + '...'
        });
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('Worker: Vanity generation complete - no match found', {
      targetSuffix: task.targetSuffix,
      totalSeedsTried,
      totalAddressesChecked,
      duration: `${duration}ms`
    });

    return {
      found: false,
      totalSeedsTried,
      totalAddressesChecked,
      duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('Worker: Error in vanity generation', {
      error: error.message,
      totalSeedsTried,
      totalAddressesChecked,
      duration: `${duration}ms`
    });

    return {
      found: false,
      totalSeedsTried,
      totalAddressesChecked,
      duration
    };
  }
}

// Listen for messages from main thread
if (parentPort) {
  parentPort.on('message', async (task: VanityWorkerTask) => {
    logger.info('Worker: Received Taproot vanity task', {
      targetSuffix: task.targetSuffix,
      addressType: 'taproot'
    });

    const result = await generateVanityAddress(task);
    
    if (parentPort) {
      parentPort.postMessage(result);
    }
    
    // If found, exit worker
    if (result.found) {
      logger.info('Worker: Exiting after finding vanity address');
      process.exit(0);
    }
  });
}
