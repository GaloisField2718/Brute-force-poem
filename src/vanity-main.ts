/**
 * Main orchestration for Vanity Address Generation
 */

import { Config } from './utils/config';
import { logger } from './utils/logger';
import { OptimizedVanityGenerator } from './3-address-derivation/optimized-vanity-generator';

interface VanityConfig {
  targetSuffix: string;
  maxSeedsToTry: number;
  maxAddressesPerSeed: number;
  workerCount: number;
}

class VanityAddressOrchestrator {
  private startTime: number = 0;
  private addressesChecked: number = 0;

  async run(config: VanityConfig): Promise<void> {
    try {
      logger.info('=== Taproot Vanity Address Generation Started ===');
      this.startTime = Date.now();

      // Step 1: Validate configuration
      logger.info('Step 1: Validating configuration');
      Config.validate();
      logger.info('Configuration valid');

      // Step 2: Display target configuration
      logger.info('Step 2: Target configuration', {
        targetSuffix: config.targetSuffix,
        addressType: 'taproot (bc1p...)',
        maxSeedsToTry: config.maxSeedsToTry
      });

      // Step 3: Start optimized vanity address generation
      logger.info('Step 3: Starting optimized vanity address generation');
      logger.info(`Searching for suffix '${config.targetSuffix}' in Taproot addresses`);
      
      // Calculate max addresses based on seeds - allow for very long searches
      const maxAddresses = config.maxSeedsToTry * config.maxAddressesPerSeed;
      
      const result = await OptimizedVanityGenerator.generateVanityAddress(
        config.targetSuffix,
        maxAddresses,
        config.maxAddressesPerSeed
      );

      this.addressesChecked = result.totalAddressesChecked;

      if (result.found) {
        const totalTime = Date.now() - this.startTime;
        
        logger.info('🎯 OPTIMIZED TAPROOT VANITY ADDRESS FOUND!', {
          address: result.address,
          path: result.path,
          suffix: config.targetSuffix,
          totalAddressesChecked: this.addressesChecked,
          duration: `${totalTime}ms`,
          generationTime: `${result.generationTime}ms`
        });

        // Save results
        const foundWallet = {
          mnemonic: result.mnemonic,
          address: result.address!,
          path: result.path!,
          privateKey: result.privateKey!,
          totalAddressesChecked: this.addressesChecked,
          totalTimeMs: totalTime,
          generationTimeMs: result.generationTime
        };

        // Write results to file
        this.writeResults(foundWallet);
        
        logger.info('Results saved to results/vanity-found.json');
        return;
      }

      const totalTime = Date.now() - this.startTime;
      logger.info('=== Optimized Vanity Address Generation Complete ===', {
        totalTime: `${(totalTime / 1000 / 60).toFixed(2)} minutes`,
        addressesChecked: this.addressesChecked,
        found: result.found
      });

      if (!result.found) {
        logger.info('No vanity address found with the specified suffix');
        logger.info('Try with a shorter suffix or increase maxSeedsToTry');
      }

    } catch (error) {
      logger.error('Fatal error in vanity orchestrator', { error: String(error) });
      throw error;
    }
  }

  /**
   * Write results to file
   */
  private writeResults(foundWallet: any): void {
    const fs = require('fs');
    const path = require('path');
    
    const resultsDir = path.join(process.cwd(), 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vanity-found-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(foundWallet, null, 2));
  }
}

// Main entry point
async function main() {
  // Get suffix from command line arguments
  const args = process.argv.slice(2);
  const targetSuffix = args[0] || 'dive'; // Default to 'dive' if not provided
  const maxSeeds = parseInt(args[1]) || 1000000; // Allow custom max seeds
  const maxAddressesPerSeed = parseInt(args[2]) || 200; // Allow custom max addresses per seed
  
  if (!targetSuffix || targetSuffix.length < 1) {
    console.error('❌ Error: Please provide a suffix');
    console.log('Usage: npm run vanity <suffix> [maxSeeds] [maxAddressesPerSeed]');
    console.log('Example: npm run vanity dive');
    console.log('Example: npm run vanity diver 5000000  # 5M seeds for longer suffix');
    console.log('Example: npm run vanity diver 5000000 500  # 5M seeds, 500 addresses per seed');
    process.exit(1);
  }

  // Validate suffix (basic checks)
  if (targetSuffix.length > 15) {
    console.error('❌ Error: Suffix too long (max 15 characters)');
    process.exit(1);
  }

  // Validate maxAddressesPerSeed
  if (maxAddressesPerSeed < 10 || maxAddressesPerSeed > 10000) {
    console.error('❌ Error: maxAddressesPerSeed must be between 10 and 10000');
    process.exit(1);
  }

  // Configuration for Taproot vanity address generation
  const vanityConfig: VanityConfig = {
    targetSuffix: targetSuffix.toLowerCase(), // Convert to lowercase
    maxSeedsToTry: maxSeeds, // Use custom or default max seeds
    maxAddressesPerSeed: maxAddressesPerSeed, // Use custom or default max addresses per seed
    workerCount: Config.WORKER_COUNT
  };

  console.log(`🎯 Searching for Taproot addresses ending with: "${targetSuffix}"`);
  console.log(`📊 Max seeds to try: ${vanityConfig.maxSeedsToTry.toLocaleString()}`);
  console.log(`🔢 Max addresses per seed: ${vanityConfig.maxAddressesPerSeed}`);
  console.log(`⚡ Workers: ${vanityConfig.workerCount}`);
  console.log(`🔍 Max addresses to check: ${(vanityConfig.maxSeedsToTry * vanityConfig.maxAddressesPerSeed).toLocaleString()}`);
  
  // Estimate time based on suffix length
  const suffixLength = targetSuffix.length;
  let estimatedTime = '';
  if (suffixLength <= 2) {
    estimatedTime = 'Seconds to minutes';
  } else if (suffixLength <= 4) {
    estimatedTime = 'Minutes to hours';
  } else if (suffixLength <= 6) {
    estimatedTime = 'Hours to days';
  } else {
    estimatedTime = 'Days to weeks (very rare)';
  }
  
  console.log(`⏱️  Estimated time: ${estimatedTime}`);
  console.log(`📏 Suffix length: ${suffixLength} characters`);
  console.log('=====================================');
  console.log('Starting in 3 seconds...');
  
  // Small delay to let user read the info
  await new Promise(resolve => setTimeout(resolve, 3000));

  const orchestrator = new VanityAddressOrchestrator();
  
  try {
    await orchestrator.run(vanityConfig);
  } catch (error) {
    logger.error('Application failed', { error: String(error) });
    process.exit(1);
  }
}

// Handle signals
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Run
main();
