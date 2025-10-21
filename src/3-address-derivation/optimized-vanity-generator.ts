/**
 * Professional-grade Taproot vanity address generator
 * Following industry best practices for Bitcoin vanity generation
 */

import * as crypto from 'crypto';
import * as bip39 from 'bip39';
import { HDWallet } from './hd-wallet';
import { logger } from '../utils/logger';

export interface OptimizedVanityResult {
  found: boolean;
  address?: string;
  path?: string;
  account?: number;
  index?: number;
  privateKey?: string;
  mnemonic?: string;
  totalAddressesChecked: number;
  generationTime: number;
}

export class OptimizedVanityGenerator {
  private static readonly ACCOUNTS_TO_CHECK = [0, 1];
  private static readonly BATCH_SIZE = 1000; // Process in batches for memory efficiency

  /**
   * Professional vanity generation using optimized techniques
   */
  static async generateVanityAddress(
    targetSuffix: string,
    maxAddresses: number = 100000000, // 100 millions d'adresses par défaut
    maxAddressesPerSeed: number = 200 // Nombre d'adresses par seed
  ): Promise<OptimizedVanityResult> {
    const startTime = Date.now();
    let totalAddressesChecked = 0;
    let batchCount = 0;

    console.log('🚀 Starting optimized Taproot vanity generation');
    console.log(`🎯 Target suffix: "${targetSuffix}"`);
    console.log(`📊 Max addresses: ${maxAddresses.toLocaleString()}`);
    console.log(`🔢 Max addresses per seed: ${maxAddressesPerSeed}`);
    console.log(`⚡ Batch size: ${this.BATCH_SIZE}`);
    console.log('=====================================');
    console.log('📈 Progress will be shown every 10 seeds');
    console.log('');
    
    logger.info('Starting optimized Taproot vanity generation', {
      targetSuffix,
      maxAddresses,
      batchSize: this.BATCH_SIZE
    });

    try {
      while (totalAddressesChecked < maxAddresses) {
        batchCount++;
        
        // Generate batch of seeds for parallel processing
        const seeds = this.generateSeedBatch(this.BATCH_SIZE);
        let batchAddressesChecked = 0;
        
        for (let i = 0; i < seeds.length; i++) {
          const seed = seeds[i];
          const result = await this.checkSeedForVanity(seed, targetSuffix, maxAddressesPerSeed);
          totalAddressesChecked += result.totalAddressesChecked;
          batchAddressesChecked += result.totalAddressesChecked;
          
          if (result.found) {
            const generationTime = Date.now() - startTime;
            
            console.log('\n🎯🎯🎯 VANITY ADDRESS FOUND! 🎯🎯🎯');
            console.log(`   Address: ${result.address}`);
            console.log(`   Path: ${result.path}`);
            console.log(`   Private Key: ${result.privateKey?.substring(0, 20)}...`);
            console.log(`   Total addresses checked: ${totalAddressesChecked.toLocaleString()}`);
            console.log(`   Generation time: ${(generationTime / 1000).toFixed(2)}s`);
            console.log(`   Batch: #${batchCount}, Seed: ${i + 1}/${seeds.length}`);
            console.log('🛑 STOPPING SEARCH - ADDRESS FOUND!');
            
            logger.info('🎯 OPTIMIZED VANITY ADDRESS FOUND!', {
              address: result.address,
              path: result.path,
              suffix: targetSuffix,
              totalAddressesChecked,
              generationTime: `${generationTime}ms`,
              batchCount
            });

            return {
              ...result,
              totalAddressesChecked,
              generationTime
            };
          }
          
          // Log progress every 10 seeds (cleaner output)
          if (i % 10 === 0 && i > 0) {
            const elapsed = Date.now() - startTime;
            const rate = totalAddressesChecked / (elapsed / 1000);
            const progress = ((totalAddressesChecked / maxAddresses) * 100).toFixed(1);
            const remaining = maxAddresses - totalAddressesChecked;
            
            // Calculate ETA more realistically
            let etaDisplay = '';
            if (rate > 0 && remaining > 0) {
              const etaSeconds = remaining / rate;
              if (etaSeconds < 60) {
                etaDisplay = `${etaSeconds.toFixed(0)}s`;
              } else if (etaSeconds < 3600) {
                etaDisplay = `${(etaSeconds / 60).toFixed(1)}min`;
              } else {
                etaDisplay = `${(etaSeconds / 3600).toFixed(1)}h`;
              }
            } else {
              etaDisplay = '∞';
            }
            
            // Calculate probability correctly for Bech32 (32 characters)
            const suffixLength = targetSuffix.length;
            const probabilityPerAddress = Math.pow(32, suffixLength);
            const expectedAddresses = probabilityPerAddress;
            const probability = Math.min(100, (totalAddressesChecked / expectedAddresses) * 100);
            
            // Clear line and show progress with better context
            const seedsProcessed = (batchCount - 1) * this.BATCH_SIZE + i + 1;
            const totalSeeds = Math.ceil(maxAddresses / maxAddressesPerSeed);
            process.stdout.write(`\r🔄 Seed ${seedsProcessed}/${totalSeeds.toLocaleString()} | 📊 ${totalAddressesChecked.toLocaleString()}/${maxAddresses.toLocaleString()} (${progress}%) | ⚡ ${rate.toFixed(0)}/s | 🎯 ${probability.toFixed(2)}% chance | ⏱️ ETA: ${etaDisplay}`);
          }
        }

        // Memory cleanup
        if (batchCount % 100 === 0) {
          if (global.gc) {
            global.gc();
          }
        }
      }

      const generationTime = Date.now() - startTime;
      
      // Clear the progress line and show final result
      console.log('\n');
      console.log('❌ No vanity address found');
      console.log(`📊 Total addresses checked: ${totalAddressesChecked.toLocaleString()}`);
      console.log(`⏱️  Total time: ${(generationTime / 1000 / 60).toFixed(2)} minutes`);
      console.log(`🚀 Average rate: ${(totalAddressesChecked / (generationTime / 1000)).toFixed(0)} addresses/sec`);
      
      logger.info('Optimized generation complete - no match found', {
        totalAddressesChecked,
        generationTime: `${generationTime}ms`,
        batchCount
      });

      return {
        found: false,
        totalAddressesChecked,
        generationTime
      };

    } catch (error) {
      logger.error('Error in optimized vanity generation', {
        error: String(error),
        totalAddressesChecked,
        batchCount
      });
      throw error;
    }
  }

  /**
   * Generate a batch of cryptographically secure seeds
   */
  private static generateSeedBatch(batchSize: number): string[] {
    const seeds: string[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      // Use crypto.randomBytes for cryptographically secure randomness
      const entropy = crypto.randomBytes(16); // 128 bits for 12 words
      const mnemonic = bip39.entropyToMnemonic(entropy);
      
      if (bip39.validateMnemonic(mnemonic)) {
        seeds.push(mnemonic);
      }
    }
    
    return seeds;
  }

  /**
   * Check a single seed for vanity address
   */
  private static async checkSeedForVanity(
    mnemonic: string,
    targetSuffix: string,
    maxAddressesPerSeed: number = 200
  ): Promise<OptimizedVanityResult> {
    try {
      const wallet = new HDWallet(mnemonic);
      let addressesChecked = 0;

      // Check both accounts (silent - no logs)
      const addressesPerAccount = Math.floor(maxAddressesPerSeed / this.ACCOUNTS_TO_CHECK.length);
      for (const account of this.ACCOUNTS_TO_CHECK) {
        for (let index = 0; index < addressesPerAccount; index++) {
          try {
            const address = wallet.deriveTaprootAddress(index, account);
            const path = `m/86'/0'/${account}'/0/${index}`;
            addressesChecked++;

            // Check if address ends with target suffix
            if (address.toLowerCase().endsWith(targetSuffix.toLowerCase())) {
              const privateKey = wallet.getPrivateKey('taproot', account, index);
              
              return {
                found: true,
                address,
                path,
                account,
                index,
                privateKey,
                mnemonic,
                totalAddressesChecked: addressesChecked,
                generationTime: 0 // Will be set by caller
              };
            }
          } catch (error) {
            // Continue with next address
            continue;
          }
        }
      }

      return {
        found: false,
        totalAddressesChecked: addressesChecked,
        generationTime: 0
      };

    } catch (error) {
      logger.error('Error checking seed for vanity', {
        error: String(error),
        mnemonic: mnemonic.substring(0, 20) + '...'
      });
      
      return {
        found: false,
        totalAddressesChecked: 0,
        generationTime: 0
      };
    }
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(maxAddressesPerSeed: number = 200): {
    maxAddressesPerSeed: number;
    batchSize: number;
    accountsToCheck: number[];
  } {
    return {
      maxAddressesPerSeed: maxAddressesPerSeed,
      batchSize: this.BATCH_SIZE,
      accountsToCheck: [...this.ACCOUNTS_TO_CHECK]
    };
  }
}
