/**
 * Vanity address generator for specific patterns
 */

import { HDWallet } from './hd-wallet';
import { logger } from '../utils/logger';

export interface VanityAddressResult {
  found: boolean;
  address?: string;
  path?: string;
  account?: number;
  index?: number;
  privateKey?: string;
  mnemonic: string;
  totalAddressesChecked: number;
}

export class VanityAddressGenerator {
  private static readonly MAX_ADDRESSES_PER_ACCOUNT = 100;
  private static readonly ACCOUNTS_TO_CHECK = [0, 1]; // Account 0 and 1

  /**
   * Generate Taproot addresses for a specific pattern
   * Tests 200 addresses per seed (2 accounts × 100 indices each)
   * ONLY TAPROOT (bc1p...) addresses are generated
   */
  static async generateForPattern(
    mnemonic: string,
    targetSuffix: string
  ): Promise<VanityAddressResult> {
    if (!mnemonic || typeof mnemonic !== 'string') {
      throw new Error('Invalid mnemonic: must be a non-empty string');
    }

    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      throw new Error(`Invalid mnemonic: expected 12 words, got ${words.length}`);
    }

    try {
      const wallet = new HDWallet(mnemonic);
      let totalAddressesChecked = 0;

      logger.debug('Starting Taproot vanity address generation', {
        mnemonic: mnemonic.substring(0, 20) + '...',
        targetSuffix,
        addressType: 'taproot',
        maxAddressesPerAccount: this.MAX_ADDRESSES_PER_ACCOUNT
      });

      // Check each account (0 and 1)
      for (const account of this.ACCOUNTS_TO_CHECK) {
        logger.debug('Checking account', { account });

        // Check addresses 0-99 for this account (TAPROOT ONLY)
        for (let index = 0; index < this.MAX_ADDRESSES_PER_ACCOUNT; index++) {
          try {
            const address = wallet.deriveTaprootAddress(index, account);
            const path = `m/86'/0'/${account}'/0/${index}`;
            
            totalAddressesChecked++;

            // Check if address ends with target suffix
            if (address.toLowerCase().endsWith(targetSuffix.toLowerCase())) {
              logger.info('🎯 TAPROOT VANITY ADDRESS FOUND!', {
                address,
                path,
                suffix: targetSuffix,
                account,
                index,
                totalAddressesChecked
              });

              // Extract private key for Taproot
              const privateKey = wallet.getPrivateKey('taproot', account, index);

              return {
                found: true,
                address,
                path,
                account,
                index,
                privateKey,
                mnemonic,
                totalAddressesChecked
              };
            }

            // Log progress every 50 addresses
            if (totalAddressesChecked % 50 === 0) {
              logger.debug('Vanity generation progress', {
                totalAddressesChecked,
                currentAccount: account,
                currentIndex: index
              });
            }

          } catch (derivationError) {
            logger.error('Failed to derive address', {
              account,
              index,
              error: String(derivationError)
            });
            // Continue with next address
          }
        }
      }

      logger.debug('Vanity generation complete - no match found', {
        mnemonic: mnemonic.substring(0, 20) + '...',
        totalAddressesChecked,
        targetSuffix
      });

      return {
        found: false,
        mnemonic,
        totalAddressesChecked
      };

    } catch (error) {
      logger.error('Failed to generate vanity addresses', { 
        error: String(error), 
        mnemonic: mnemonic.substring(0, 20) + '...' 
      });
      throw error;
    }
  }


  /**
   * Get total number of addresses that will be checked per seed
   */
  static getTotalAddressCount(): number {
    return this.ACCOUNTS_TO_CHECK.length * this.MAX_ADDRESSES_PER_ACCOUNT;
  }

  /**
   * Get accounts that will be checked
   */
  static getAccountsToCheck(): number[] {
    return [...this.ACCOUNTS_TO_CHECK];
  }

  /**
   * Get max addresses per account
   */
  static getMaxAddressesPerAccount(): number {
    return this.MAX_ADDRESSES_PER_ACCOUNT;
  }
}
