"use strict";
/**
 * BIP39 word filtering based on constraints
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
exports.BIP39Filter = void 0;
const bip39 = __importStar(require("bip39"));
const logger_1 = require("../utils/logger");
// Dynamic import for ES Module
let syllableFunction = null;
async function loadSyllable() {
    if (!syllableFunction) {
        const syllableModule = await Promise.resolve().then(() => __importStar(require('syllable')));
        syllableFunction = syllableModule.syllable;
    }
    return syllableFunction;
}
class BIP39Filter {
    static wordlist = bip39.wordlists.english;
    /**
     * Get all BIP39 words
     */
    static getAllWords() {
        return [...this.wordlist];
    }
    /**
     * Filter BIP39 words based on constraints
     */
    static async filterWords(blank, tolerance = 1) {
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
        const filtered = [];
        const syllable = await loadSyllable();
        for (const word of this.wordlist) {
            let matchScore = 0;
            let maxScore = 0;
            // Length constraint (±tolerance)
            maxScore += 3;
            const lengthDiff = Math.abs(word.length - constraints.length);
            if (lengthDiff === 0) {
                matchScore += 3;
            }
            else if (lengthDiff <= tolerance) {
                matchScore += 2;
            }
            else if (lengthDiff <= tolerance + 1) {
                matchScore += 1;
            }
            // Syllable constraint
            maxScore += 2;
            const syllables = syllable(word);
            if (syllables === constraints.syllables) {
                matchScore += 2;
            }
            else if (Math.abs(syllables - constraints.syllables) === 1) {
                matchScore += 1;
            }
            // Rhyme constraint (if present)
            if (constraints.rhyme_with) {
                maxScore += 2;
                if (this.rhymes(word, constraints.rhyme_with)) {
                    matchScore += 2;
                }
                else if (this.partialRhyme(word, constraints.rhyme_with)) {
                    matchScore += 1;
                }
            }
            // Only include words with reasonable match
            const scoreRatio = matchScore / maxScore;
            if (scoreRatio >= 0.4) { // At least 40% match
                filtered.push({
                    word,
                    matchScore: scoreRatio
                });
            }
        }
        // Sort by match score
        filtered.sort((a, b) => b.matchScore - a.matchScore);
        logger_1.logger.debug('BIP39 filtering complete', {
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
    static rhymes(word1, word2) {
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
    static partialRhyme(word1, word2) {
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
    static filterBySemantic(words, _semanticDomain) {
        // This is a simple implementation - in production, you'd use word embeddings
        // For now, just return all words as we'll rely on OpenRouter for semantic filtering
        return words;
    }
    /**
     * Get top-k words from filtered list
     */
    static getTopK(filteredWords, k) {
        return filteredWords.slice(0, k).map(f => f.word);
    }
    /**
     * Filter words by pattern (basic POS detection)
     */
    static filterByPattern(words, pattern) {
        // Simple pattern matching based on common suffixes
        const patterns = {
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
        return words.filter(word => suffixes.some(suffix => word.endsWith(suffix)));
    }
    /**
     * Validate that a mnemonic is valid BIP39
     */
    static validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    }
    /**
     * Generate all valid 12th words for a given 11-word prefix
     */
    static findValidLastWords(first11Words) {
        if (first11Words.length !== 11) {
            throw new Error('Must provide exactly 11 words');
        }
        const validSeeds = [];
        for (const lastWord of this.wordlist) {
            const mnemonic = [...first11Words, lastWord].join(' ');
            if (this.validateMnemonic(mnemonic)) {
                validSeeds.push(lastWord);
            }
        }
        return validSeeds;
    }
}
exports.BIP39Filter = BIP39Filter;
//# sourceMappingURL=bip39-filter.js.map