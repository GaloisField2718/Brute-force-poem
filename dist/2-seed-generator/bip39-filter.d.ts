/**
 * BIP39 word filtering based on constraints
 */
import { PoemBlank } from '../types';
export interface FilteredWord {
    word: string;
    matchScore: number;
}
export declare class BIP39Filter {
    private static wordlist;
    /**
     * Get all BIP39 words
     */
    static getAllWords(): string[];
    /**
     * Filter BIP39 words based on constraints
     */
    static filterWords(blank: PoemBlank, tolerance?: number): Promise<FilteredWord[]>;
    /**
     * Check if two words rhyme (same ending sounds)
     */
    private static rhymes;
    /**
     * Check for partial rhyme (assonance or consonance)
     */
    private static partialRhyme;
    /**
     * Filter words by semantic domain (basic keyword matching)
     */
    static filterBySemantic(words: string[], _semanticDomain: string[]): string[];
    /**
     * Get top-k words from filtered list
     */
    static getTopK(filteredWords: FilteredWord[], k: number): string[];
    /**
     * Filter words by pattern (basic POS detection)
     */
    static filterByPattern(words: string[], pattern: string): string[];
    /**
     * Validate that a mnemonic is valid BIP39
     */
    static validateMnemonic(mnemonic: string): boolean;
    /**
     * Generate all valid 12th words for a given 11-word prefix
     */
    static findValidLastWords(first11Words: string[]): string[];
}
//# sourceMappingURL=bip39-filter.d.ts.map