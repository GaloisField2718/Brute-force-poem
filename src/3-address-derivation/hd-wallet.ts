/**
 * HD Wallet derivation with BIP32/44/49/84/86 support
 */

import * as bip39 from 'bip39';
import { BIP32Factory, BIP32Interface } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import * as tinysecp from 'tiny-secp256k1';

// Initialize ECC library for Taproot support
bitcoin.initEccLib(ecc);

// Create BIP32 factory
const bip32 = BIP32Factory(tinysecp);

export class HDWallet {
  private root: BIP32Interface;
  private network: bitcoin.Network;

  constructor(mnemonic: string, network: bitcoin.Network = bitcoin.networks.bitcoin) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    this.root = bip32.fromSeed(seed, network);
    this.network = network;
  }

  /**
   * Derive a child node at the given path
   */
  private derivePath(path: string): BIP32Interface {
    return this.root.derivePath(path);
  }

  /**
   * Generate Legacy P2PKH address (BIP44)
   * Path: m/44'/0'/0'/0/index
   */
  deriveLegacyAddress(index: number): string {
    const path = `m/44'/0'/0'/0/${index}`;
    const child = this.derivePath(path);
    
    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: this.network
    });

    if (!address) {
      throw new Error('Failed to derive legacy address');
    }

    return address;
  }

  /**
   * Generate Nested SegWit P2SH-P2WPKH address (BIP49)
   * Path: m/49'/0'/0'/0/index
   */
  deriveNestedSegWitAddress(index: number): string {
    const path = `m/49'/0'/0'/0/${index}`;
    const child = this.derivePath(path);

    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: this.network
      }),
      network: this.network
    });

    if (!address) {
      throw new Error('Failed to derive nested SegWit address');
    }

    return address;
  }

  /**
   * Generate Native SegWit Bech32 address (BIP84)
   * Path: m/84'/0'/0'/0/index
   */
  deriveNativeSegWitAddress(index: number): string {
    const path = `m/84'/0'/0'/0/${index}`;
    const child = this.derivePath(path);

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: this.network
    });

    if (!address) {
      throw new Error('Failed to derive native SegWit address');
    }

    return address;
  }

  /**
   * Generate Taproot Bech32m address (BIP86)
   * Path: m/86'/0'/0'/0/index
   */
  deriveTaprootAddress(index: number): string {
    const path = `m/86'/0'/0'/0/${index}`;
    const child = this.derivePath(path);

    // For Taproot, we need to use the x-only public key (32 bytes)
    // Remove the first byte (prefix) from the 33-byte compressed public key
    const internalPubkey = child.publicKey.slice(1, 33);

    const { address } = bitcoin.payments.p2tr({
      internalPubkey: internalPubkey,
      network: this.network
    });

    if (!address) {
      throw new Error('Failed to derive Taproot address');
    }

    return address;
  }

  /**
   * Get the root extended public key
   */
  getXPub(): string {
    return this.root.toBase58();
  }

  /**
   * Get the mnemonic used to create this wallet
   * (Note: not stored, must be passed separately)
   */
  static seedToMnemonic(seed: Buffer): string {
    return bip39.entropyToMnemonic(seed);
  }

  /**
   * Validate a mnemonic phrase
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Get all BIP39 wordlist
   */
  static getWordlist(): string[] {
    return bip39.wordlists.english;
  }
}
