"use strict";
/**
 * Beam search for generating optimal seed phrases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeamSearch = void 0;
const checksum_validator_1 = require("./checksum-validator");
const logger_1 = require("../utils/logger");
class BeamSearch {
    beamWidth;
    wordScoresPerPosition = new Map();
    constructor(beamWidth) {
        this.beamWidth = beamWidth;
    }
    /**
     * Set word scores for all positions
     */
    setWordScores(scoredCandidates) {
        for (const [position, candidates] of scoredCandidates.entries()) {
            const scoreMap = new Map();
            for (const candidate of candidates) {
                scoreMap.set(candidate.word, candidate.score);
            }
            this.wordScoresPerPosition.set(position, scoreMap);
        }
    }
    /**
     * Run beam search to generate top-k seed phrases
     */
    search(candidatesPerPosition, maxResults = 10000) {
        if (maxResults <= 0) {
            throw new Error('maxResults must be positive');
        }
        if (this.beamWidth <= 0) {
            throw new Error('beamWidth must be positive');
        }
        // Validate we have candidates for positions 1-11
        for (let pos = 1; pos <= 11; pos++) {
            const candidates = candidatesPerPosition.get(pos);
            if (!candidates || candidates.length === 0) {
                throw new Error(`No candidates for position ${pos}. Cannot perform beam search.`);
            }
        }
        const startTime = Date.now();
        // Initialize beam with empty state
        let beam = [{
                partialSeed: [],
                score: 0,
                depth: 0
            }];
        // Expand beam for each position (1-11, position 12 is computed)
        for (let position = 1; position <= 11; position++) {
            const candidates = candidatesPerPosition.get(position) || [];
            if (candidates.length === 0) {
                logger_1.logger.warn('No candidates for position', { position });
                continue;
            }
            beam = this.expandBeam(beam, candidates, position);
            logger_1.logger.debug('Beam search progress', {
                position,
                beamSize: beam.length,
                topScore: beam[0]?.score.toFixed(4)
            });
        }
        // Now we have all 11-word prefixes in the beam
        // Find valid last words for each prefix
        const validSeeds = [];
        for (const state of beam) {
            if (state.partialSeed.length !== 11) {
                continue;
            }
            const validLastWords = checksum_validator_1.ChecksumValidator.findValidLastWords(state.partialSeed);
            for (const lastWord of validLastWords) {
                const lastWordScore = this.getWordScore(12, lastWord);
                const totalScore = (state.score * 11 + lastWordScore) / 12;
                const fullSeed = [...state.partialSeed, lastWord].join(' ');
                validSeeds.push({
                    seed: fullSeed,
                    score: totalScore
                });
            }
            // Stop if we have enough results
            if (validSeeds.length >= maxResults) {
                break;
            }
        }
        // Sort by score and return top results
        validSeeds.sort((a, b) => b.score - a.score);
        const results = validSeeds.slice(0, maxResults).map(item => item.seed);
        const duration = Date.now() - startTime;
        logger_1.logger.info('Beam search complete', {
            totalSeeds: results.length,
            duration: `${duration}ms`,
            topScore: validSeeds[0]?.score.toFixed(4)
        });
        return results;
    }
    /**
     * Expand beam by one position
     */
    expandBeam(currentBeam, candidates, position) {
        const newStates = [];
        // For each state in current beam
        for (const state of currentBeam) {
            // Try each candidate word
            for (const word of candidates) {
                const wordScore = this.getWordScore(position, word);
                // Calculate cumulative score
                const newScore = (state.score * state.depth + wordScore) / (state.depth + 1);
                newStates.push({
                    partialSeed: [...state.partialSeed, word],
                    score: newScore,
                    depth: state.depth + 1
                });
            }
        }
        // Sort by score and keep top beamWidth states
        newStates.sort((a, b) => b.score - a.score);
        return newStates.slice(0, this.beamWidth);
    }
    /**
     * Get score for a word at a specific position
     */
    getWordScore(position, word) {
        const scoreMap = this.wordScoresPerPosition.get(position);
        return scoreMap?.get(word) || 0.01; // Default low score
    }
    /**
     * Generate seeds using simple combinatorial approach (fallback)
     */
    static generateCombinatorial(candidatesPerPosition, maxResults = 1000) {
        const seeds = [];
        const positions = Array.from({ length: 11 }, (_, i) => i + 1);
        // Generate random combinations
        for (let i = 0; i < maxResults * 10; i++) {
            const words = [];
            for (const position of positions) {
                const candidates = candidatesPerPosition.get(position) || [];
                if (candidates.length === 0) {
                    break;
                }
                const randomIndex = Math.floor(Math.random() * candidates.length);
                words.push(candidates[randomIndex]);
            }
            if (words.length === 11) {
                // Find valid last words
                const validLastWords = checksum_validator_1.ChecksumValidator.findValidLastWords(words);
                for (const lastWord of validLastWords) {
                    const fullSeed = [...words, lastWord].join(' ');
                    seeds.push(fullSeed);
                    if (seeds.length >= maxResults) {
                        return seeds;
                    }
                }
            }
        }
        return seeds;
    }
    /**
     * Get statistics about the search space
     */
    getSearchSpaceSize(candidatesPerPosition) {
        let size = 1;
        for (let position = 1; position <= 11; position++) {
            const candidates = candidatesPerPosition.get(position);
            if (candidates) {
                size *= candidates.length;
            }
        }
        // Multiply by average number of valid last words (~16)
        size *= 16;
        return size;
    }
}
exports.BeamSearch = BeamSearch;
//# sourceMappingURL=beam-search.js.map