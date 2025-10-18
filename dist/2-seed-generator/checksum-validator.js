"use strict";
/**
 * BIP39 checksum validation and last word generation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecksumValidator = void 0;
const bip39 = __importStar(require("bip39"));
const crypto = __importStar(require("crypto"));
const logger_1 = require("../utils/logger");
class ChecksumValidator {
    static wordlist = bip39.wordlists.english;
    /**
     * Validate a complete mnemonic
     */
    static validateMnemonic(words) {
        const mnemonic = words.join(' ');
        return bip39.validateMnemonic(mnemonic);
    }
    /**
     * Find all valid last words for an 11-word prefix
     * The last word contains 4 bits of checksum
     */
    static findValidLastWords(first11Words) {
        if (first11Words.length !== 11) {
            throw new Error('Must provide exactly 11 words');
        }
        const validLastWords = [];
        // Try each word in the wordlist as the 12th word
        for (const lastWord of this.wordlist) {
            const fullMnemonic = [...first11Words, lastWord].join(' ');
            if (bip39.validateMnemonic(fullMnemonic)) {
                validLastWords.push(lastWord);
            }
        }
        logger_1.logger.debug('Found valid last words', {
            count: validLastWords.length,
            words: validLastWords
        });
        return validLastWords;
    }
    /**
     * Generate all possible complete mnemonics from a partial mnemonic
     * This is used in beam search when we have the first 11 words
     */
    static completePartialMnemonic(partialWords) {
        if (partialWords.length === 12) {
            // Already complete, just validate
            return this.validateMnemonic(partialWords) ? [partialWords.join(' ')] : [];
        }
        if (partialWords.length === 11) {
            // Find valid last words
            const validLastWords = this.findValidLastWords(partialWords);
            return validLastWords.map(lastWord => [...partialWords, lastWord].join(' '));
        }
        // Not enough words yet
        return [];
    }
    /**
     * Check if a partial mnemonic can potentially be valid
     * (all words exist in BIP39 wordlist)
     */
    static isPartialMnemonicValid(words) {
        return words.every(word => this.wordlist.includes(word));
    }
    /**
     * Get the number of valid checksums for 11 words
     * Theoretically, there should be ~16 valid last words (2048 / 128)
     */
    static getExpectedValidLastWordCount() {
        return Math.floor(this.wordlist.length / 128); // ~16
    }
    /**
     * Calculate checksum for entropy (for reference)
     */
    static calculateChecksum(entropy) {
        if (!entropy || entropy.length === 0) {
            throw new Error('Invalid entropy: must be non-empty Buffer');
        }
        const hash = crypto.createHash('sha256').update(entropy).digest();
        return hash;
    }
    /**
     * Batch validate multiple mnemonics
     */
    static validateMnemonics(mnemonics) {
        return mnemonics.map(mnemonic => bip39.validateMnemonic(mnemonic));
    }
    /**
     * Get statistics about valid last words distribution
     */
    static getLastWordStatistics(first11Words) {
        const validWords = this.findValidLastWords(first11Words);
        return {
            totalPossible: this.wordlist.length,
            validCount: validWords.length,
            validWords
        };
    }
}
exports.ChecksumValidator = ChecksumValidator;
//# sourceMappingURL=checksum-validator.js.map