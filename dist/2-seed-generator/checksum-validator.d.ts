/**
 * BIP39 checksum validation and last word generation
 */
export declare class ChecksumValidator {
    private static wordlist;
    /**
     * Validate a complete mnemonic
     */
    static validateMnemonic(words: string[]): boolean;
    /**
     * Find all valid last words for an 11-word prefix
     * The last word contains 4 bits of checksum
     */
    static findValidLastWords(first11Words: string[]): string[];
    /**
     * Generate all possible complete mnemonics from a partial mnemonic
     * This is used in beam search when we have the first 11 words
     */
    static completePartialMnemonic(partialWords: string[]): string[];
    /**
     * Check if a partial mnemonic can potentially be valid
     * (all words exist in BIP39 wordlist)
     */
    static isPartialMnemonicValid(words: string[]): boolean;
    /**
     * Get the number of valid checksums for 11 words
     * Theoretically, there should be ~16 valid last words (2048 / 128)
     */
    static getExpectedValidLastWordCount(): number;
    /**
     * Calculate checksum for entropy (for reference)
     */
    static calculateChecksum(entropy: Buffer): Buffer;
    /**
     * Batch validate multiple mnemonics
     */
    static validateMnemonics(mnemonics: string[]): boolean[];
    /**
     * Get statistics about valid last words distribution
     */
    static getLastWordStatistics(first11Words: string[]): {
        totalPossible: number;
        validCount: number;
        validWords: string[];
    };
}
//# sourceMappingURL=checksum-validator.d.ts.map