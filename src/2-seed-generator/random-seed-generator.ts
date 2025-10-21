/**
 * Random BIP39 seed phrase generator for vanity address generation
 */

import * as bip39 from 'bip39';
import { logger } from '../utils/logger';

export interface RandomSeedResult {
  mnemonic: string;
  entropy: string;
  seed: Buffer;
}

export class RandomSeedGenerator {
  /**
   * Generate a random BIP39 seed phrase
   */
  static generateRandomSeed(): RandomSeedResult {
    try {
      // Generate 128 bits of entropy (12 words)
      const entropy = bip39.generateMnemonic(128);
      
      // Validate the generated mnemonic
      if (!bip39.validateMnemonic(entropy)) {
        throw new Error('Generated mnemonic is invalid');
      }

      // Convert to seed
      const seed = bip39.mnemonicToSeedSync(entropy);

      logger.debug('Generated random seed', {
        mnemonic: entropy.substring(0, 20) + '...',
        entropyLength: entropy.split(' ').length
      });

      return {
        mnemonic: entropy,
        entropy: entropy,
        seed
      };
    } catch (error) {
      logger.error('Failed to generate random seed', { error: String(error) });
      throw error;
    }
  }

  /**
   * Generate multiple random seeds
   */
  static generateMultipleSeeds(count: number): RandomSeedResult[] {
    const seeds: RandomSeedResult[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const seed = this.generateRandomSeed();
        seeds.push(seed);
      } catch (error) {
        logger.warn('Failed to generate seed', { index: i, error: String(error) });
        // Continue with next seed
      }
    }

    logger.info('Generated multiple seeds', {
      requested: count,
      generated: seeds.length
    });

    return seeds;
  }

  /**
   * Validate a mnemonic
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }
}
