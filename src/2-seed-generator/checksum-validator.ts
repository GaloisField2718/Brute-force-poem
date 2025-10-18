/**
 * BIP39 checksum validation and last word generation
 */

import * as bip39 from 'bip39';
import { logger } from '../utils/logger';

export class ChecksumValidator {
  private static wordlist: string[] = bip39.wordlists.english;

  /**
   * Validate a complete mnemonic
   */
  static validateMnemonic(words: string[]): boolean {
    const mnemonic = words.join(' ');
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Find all valid last words for an 11-word prefix
   * The last word contains 4 bits of checksum
   */
  static findValidLastWords(first11Words: string[]): string[] {
    if (first11Words.length !== 11) {
      throw new Error('Must provide exactly 11 words');
    }

    const validLastWords: string[] = [];

    // Try each word in the wordlist as the 12th word
    for (const lastWord of this.wordlist) {
      const fullMnemonic = [...first11Words, lastWord].join(' ');
      
      if (bip39.validateMnemonic(fullMnemonic)) {
        validLastWords.push(lastWord);
      }
    }

    logger.debug('Found valid last words', {
      count: validLastWords.length,
      words: validLastWords
    });

    return validLastWords;
  }

  /**
   * Generate all possible complete mnemonics from a partial mnemonic
   * This is used in beam search when we have the first 11 words
   */
  static completePartialMnemonic(partialWords: string[]): string[] {
    if (partialWords.length === 12) {
      // Already complete, just validate
      return this.validateMnemonic(partialWords) ? [partialWords.join(' ')] : [];
    }

    if (partialWords.length === 11) {
      // Find valid last words
      const validLastWords = this.findValidLastWords(partialWords);
      return validLastWords.map(lastWord => 
        [...partialWords, lastWord].join(' ')
      );
    }

    // Not enough words yet
    return [];
  }

  /**
   * Check if a partial mnemonic can potentially be valid
   * (all words exist in BIP39 wordlist)
   */
  static isPartialMnemonicValid(words: string[]): boolean {
    return words.every(word => this.wordlist.includes(word));
  }

  /**
   * Get the number of valid checksums for 11 words
   * Theoretically, there should be ~16 valid last words (2048 / 128)
   */
  static getExpectedValidLastWordCount(): number {
    return Math.floor(this.wordlist.length / 128); // ~16
  }

  /**
   * Calculate checksum for entropy (for reference)
   */
  static calculateChecksum(entropy: Buffer): Buffer {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(entropy).digest();
    return hash;
  }

  /**
   * Batch validate multiple mnemonics
   */
  static validateMnemonics(mnemonics: string[]): boolean[] {
    return mnemonics.map(mnemonic => bip39.validateMnemonic(mnemonic));
  }

  /**
   * Get statistics about valid last words distribution
   */
  static getLastWordStatistics(first11Words: string[]): {
    totalPossible: number;
    validCount: number;
    validWords: string[];
  } {
    const validWords = this.findValidLastWords(first11Words);
    
    return {
      totalPossible: this.wordlist.length,
      validCount: validWords.length,
      validWords
    };
  }
}
