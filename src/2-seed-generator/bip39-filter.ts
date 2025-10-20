/**
 * BIP39 word filtering based on constraints
 */

import * as bip39 from 'bip39';
import { PoemBlank } from '../types';
import { logger } from '../utils/logger';

// Dynamic import for ES Module - use Function constructor to prevent TS from transforming it
let syllableFunction: ((text: string) => number) | null = null;

async function loadSyllable(): Promise<(text: string) => number> {
  if (!syllableFunction) {
    // Use Function constructor to create a real dynamic import that TS won't transform
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
    const syllableModule = await dynamicImport('syllable');
    syllableFunction = syllableModule.syllable;
  }
  return syllableFunction!; // Non-null assertion since we just set it above
}

export interface FilteredWord {
  word: string;
  matchScore: number;
}

export class BIP39Filter {
  private static wordlist: string[] = bip39.wordlists.english;

  /**
   * Get all BIP39 words
   */
  static getAllWords(): string[] {
    return [...this.wordlist];
  }

  /**
   * Filter BIP39 words based on constraints
   */
  static async filterWords(blank: PoemBlank, tolerance: number = 1): Promise<FilteredWord[]> {
    if (!blank || !blank.constraints) {
      throw new Error('Invalid blank: missing constraints');
    }

    if (blank.constraints.length <= 0) {
      throw new Error('Invalid constraint: length must be positive');
    }

    if (blank.constraints.syllables < 0) {
      throw new Error('Invalid constraint: syllables must be non-negative');
    }

    const constraints = blank.constraints;
    const filtered: FilteredWord[] = [];
    const syllable = await loadSyllable();

    for (const word of this.wordlist) {
      let matchScore = 0;
      let maxScore = 0;

      // Length constraint (±tolerance)
      maxScore += 3;
      const lengthDiff = Math.abs(word.length - constraints.length);
      if (lengthDiff === 0) {
        matchScore += 3;
      } else if (lengthDiff <= tolerance) {
        matchScore += 2;
      } else if (lengthDiff <= tolerance + 1) {
        matchScore += 1;
      }

      // Syllable constraint
      maxScore += 2;
      const syllables = syllable(word);
      if (syllables === constraints.syllables) {
        matchScore += 2;
      } else if (Math.abs(syllables - constraints.syllables) === 1) {
        matchScore += 1;
      }

      // Rhyme constraint (if present)
      if (constraints.rhyme_with) {
        maxScore += 2;
        if (this.rhymes(word, constraints.rhyme_with)) {
          matchScore += 2;
        } else if (this.partialRhyme(word, constraints.rhyme_with)) {
          matchScore += 1;
        }
      }

      // Only include words with reasonable match
      const scoreRatio = matchScore / maxScore;
      if (scoreRatio >= 0.2) { // LOWERED threshold for more candidates
        filtered.push({
          word,
          matchScore: scoreRatio
        });
      }
    }

    // Sort by match score
    filtered.sort((a, b) => b.matchScore - a.matchScore);

    logger.debug('BIP39 filtering complete', {
      position: blank.position,
      totalWords: this.wordlist.length,
      filteredCount: filtered.length,
      topWords: filtered.slice(0, 5).map(f => f.word)
    });

    return filtered;
  }

  /**
   * Check if two words rhyme (same ending sounds)
   */
  private static rhymes(word1: string, word2: string): boolean {
    // Simple rhyme detection: last 2-3 characters match
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();

    if (w1.length < 2 || w2.length < 2) {
      return false;
    }

    // Check last 3 characters
    if (w1.length >= 3 && w2.length >= 3) {
      if (w1.slice(-3) === w2.slice(-3)) {
        return true;
      }
    }

    // Check last 2 characters
    return w1.slice(-2) === w2.slice(-2);
  }

  /**
   * Check for partial rhyme (assonance or consonance)
   */
  private static partialRhyme(word1: string, word2: string): boolean {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();

    if (w1.length < 2 || w2.length < 2) {
      return false;
    }

    // Check if last vowel matches
    const vowels = 'aeiou';
    const lastVowel1 = [...w1].reverse().find(c => vowels.includes(c));
    const lastVowel2 = [...w2].reverse().find(c => vowels.includes(c));

    return lastVowel1 === lastVowel2;
  }

  /**
   * Filter words by semantic domain (basic keyword matching)
   */
  static filterBySemantic(words: string[], _semanticDomain: string[]): string[] {
    // This is a simple implementation - in production, you'd use word embeddings
    // For now, just return all words as we'll rely on OpenRouter for semantic filtering
    return words;
  }

  /**
   * Get top-k words from filtered list
   */
  static getTopK(filteredWords: FilteredWord[], k: number): string[] {
    // INCREASED from k to 20 to give OpenRouter more options
    return filteredWords.slice(0, Math.max(k, 20)).map(f => f.word);
  }

  /**
   * Filter words by pattern (basic POS detection)
   */
  static filterByPattern(words: string[], pattern: string): string[] {
    // Simple pattern matching based on common suffixes
    const patterns: Record<string, string[]> = {
      'noun': ['tion', 'ness', 'ment', 'ity', 'er', 'or', 'ist', 'age'],
      'verb': ['ate', 'ify', 'ize', 'en', 'ing', 'ed'],
      'adjective': ['ful', 'less', 'ous', 'ive', 'able', 'ible', 'al', 'ic'],
      'past_participle': ['ed', 'en'],
      'plural_noun': ['s', 'es', 'ies']
    };

    // If pattern not recognized, return all words
    const suffixes = patterns[pattern] || [];
    if (suffixes.length === 0) {
      return words;
    }

    // Filter by suffix
    return words.filter(word => 
      suffixes.some(suffix => word.endsWith(suffix))
    );
  }

  /**
   * Validate that a mnemonic is valid BIP39
   */
  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Generate all valid 12th words for a given 11-word prefix
   */
  static findValidLastWords(first11Words: string[]): string[] {
    if (first11Words.length !== 11) {
      throw new Error('Must provide exactly 11 words');
    }

    const validSeeds: string[] = [];

    for (const lastWord of this.wordlist) {
      const mnemonic = [...first11Words, lastWord].join(' ');
      if (this.validateMnemonic(mnemonic)) {
        validSeeds.push(lastWord);
      }
    }

    return validSeeds;
  }
}
