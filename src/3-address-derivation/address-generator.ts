/**
 * Address generation for all derivation paths
 */

import { HDWallet } from './hd-wallet';
import { DerivedAddress, AddressType, DerivationPath } from '../types';
import { logger } from '../utils/logger';

/**
 * Derivation paths configuration
 */
export const DERIVATION_PATHS: DerivationPath[] = [
  {
    standard: 'BIP44',
    type: 'legacy',
    indices: [0, 1, 2],
    path: "m/44'/0'/0'/0/{index}"
  },
  {
    standard: 'BIP49',
    type: 'nested-segwit',
    indices: [0, 1, 2],
    path: "m/49'/0'/0'/0/{index}"
  },
  {
    standard: 'BIP84',
    type: 'native-segwit',
    indices: [0, 1, 2],
    path: "m/84'/0'/0'/0/{index}"
  },
  {
    standard: 'BIP86',
    type: 'taproot',
    indices: [0, 1, 2],
    path: "m/86'/0'/0'/0/{index}"
  }
];

export class AddressGenerator {
  /**
   * Derive all addresses for a given mnemonic
   * Returns 12 addresses (4 types × 3 indices)
   */
  static deriveAllAddresses(mnemonic: string): DerivedAddress[] {
    try {
      const wallet = new HDWallet(mnemonic);
      const addresses: DerivedAddress[] = [];

      for (const pathConfig of DERIVATION_PATHS) {
        for (const index of pathConfig.indices) {
          const address = this.deriveAddress(wallet, pathConfig.type, index);
          const path = pathConfig.path.replace('{index}', index.toString());

          addresses.push({
            address,
            path,
            type: pathConfig.type,
            index
          });
        }
      }

      return addresses;
    } catch (error) {
      logger.error('Failed to derive addresses', { error: String(error), mnemonic: '***' });
      throw error;
    }
  }

  /**
   * Derive a single address based on type and index
   */
  private static deriveAddress(wallet: HDWallet, type: AddressType, index: number): string {
    switch (type) {
      case 'legacy':
        return wallet.deriveLegacyAddress(index);
      case 'nested-segwit':
        return wallet.deriveNestedSegWitAddress(index);
      case 'native-segwit':
        return wallet.deriveNativeSegWitAddress(index);
      case 'taproot':
        return wallet.deriveTaprootAddress(index);
      default:
        throw new Error(`Unknown address type: ${type}`);
    }
  }

  /**
   * Derive addresses for a specific type and index range
   */
  static deriveAddressesByType(
    mnemonic: string,
    type: AddressType,
    startIndex: number = 0,
    count: number = 3
  ): DerivedAddress[] {
    try {
      const wallet = new HDWallet(mnemonic);
      const addresses: DerivedAddress[] = [];
      const pathConfig = DERIVATION_PATHS.find(p => p.type === type);

      if (!pathConfig) {
        throw new Error(`Unknown address type: ${type}`);
      }

      for (let i = startIndex; i < startIndex + count; i++) {
        const address = this.deriveAddress(wallet, type, i);
        const path = pathConfig.path.replace('{index}', i.toString());

        addresses.push({
          address,
          path,
          type,
          index: i
        });
      }

      return addresses;
    } catch (error) {
      logger.error('Failed to derive addresses by type', { 
        error: String(error), 
        type, 
        startIndex, 
        count 
      });
      throw error;
    }
  }

  /**
   * Get total number of addresses that will be derived per seed
   */
  static getTotalAddressCount(): number {
    return DERIVATION_PATHS.reduce((sum, path) => sum + path.indices.length, 0);
  }
}
