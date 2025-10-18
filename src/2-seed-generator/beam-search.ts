/**
 * Beam search for generating optimal seed phrases
 */

import { BeamSearchState, ScoredCandidate, PoemBlank } from '../types';
import { ChecksumValidator } from './checksum-validator';
import { logger } from '../utils/logger';

export class BeamSearch {
  private beamWidth: number;
  private wordScoresPerPosition: Map<number, Map<string, number>> = new Map();
  private position12Constraints: PoemBlank | null = null;

  constructor(beamWidth: number) {
    this.beamWidth = beamWidth;
  }

  /**
   * Set word scores for all positions
   */
  setWordScores(
    scoredCandidates: Map<number, ScoredCandidate[]>
  ): void {
    for (const [position, candidates] of scoredCandidates.entries()) {
      const scoreMap = new Map<string, number>();
      
      for (const candidate of candidates) {
        scoreMap.set(candidate.word, candidate.score);
      }
      
      this.wordScoresPerPosition.set(position, scoreMap);
    }
  }

  /**
   * Set constraints for position 12 (optional - for filtering last words)
   */
  setPosition12Constraints(blank: PoemBlank | null): void {
    this.position12Constraints = blank;
    if (blank) {
      logger.info('Position 12 constraints enabled', {
        length: blank.constraints.length,
        syllables: blank.constraints.syllables,
        semanticDomain: blank.constraints.semantic_domain
      });
    }
  }

  /**
   * Run beam search to generate top-k seed phrases
   */
  search(
    candidatesPerPosition: Map<number, string[]>,
    maxResults: number = 10000
  ): string[] {
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
    let beam: BeamSearchState[] = [{
      partialSeed: [],
      score: 0,
      depth: 0
    }];

    // Expand beam for each position (1-11, position 12 is computed)
    for (let position = 1; position <= 11; position++) {
      const candidates = candidatesPerPosition.get(position) || [];
      
      if (candidates.length === 0) {
        logger.warn('No candidates for position', { position });
        continue;
      }

      beam = this.expandBeam(beam, candidates, position);
      
      logger.debug('Beam search progress', {
        position,
        beamSize: beam.length,
        topScore: beam[0]?.score.toFixed(4)
      });
    }

    // Now we have all 11-word prefixes in the beam
    // Find valid last words for each prefix
    const validSeeds: Array<{ seed: string; score: number }> = [];
    const seenSeeds = new Set<string>();  // Track duplicates

    for (const state of beam) {
      if (state.partialSeed.length !== 11) {
        continue;
      }

      let validLastWords = ChecksumValidator.findValidLastWords(state.partialSeed);
      
      // Filter last words by position 12 poem constraints if available
      if (this.position12Constraints) {
        validLastWords = this.filterLastWordsByConstraints(validLastWords);
      }
      
      for (const lastWord of validLastWords) {
        const lastWordScore = this.getWordScore(12, lastWord);
        const totalScore = (state.score * 11 + lastWordScore) / 12;
        const fullSeed = [...state.partialSeed, lastWord].join(' ');
        
        // Only add if not already seen (CRITICAL: prevents duplicates)
        if (!seenSeeds.has(fullSeed)) {
          validSeeds.push({
            seed: fullSeed,
            score: totalScore
          });
          seenSeeds.add(fullSeed);
        }
      }

      // Stop if we have enough unique results
      if (validSeeds.length >= maxResults) {
        break;
      }
    }

    // Sort by score and return top results
    validSeeds.sort((a, b) => b.score - a.score);
    const results = validSeeds.slice(0, maxResults).map(item => item.seed);

    const duration = Date.now() - startTime;
    const duplicatesSkipped = beam.length * 16 - seenSeeds.size;
    logger.info('Beam search complete', {
      totalSeeds: results.length,
      uniqueSeeds: seenSeeds.size,
      duplicatesSkipped: duplicatesSkipped > 0 ? duplicatesSkipped : 0,
      duration: `${duration}ms`,
      topScore: validSeeds[0]?.score.toFixed(4)
    });

    return results;
  }

  /**
   * Expand beam by one position
   */
  private expandBeam(
    currentBeam: BeamSearchState[],
    candidates: string[],
    position: number
  ): BeamSearchState[] {
    const newStates: BeamSearchState[] = [];

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
  private getWordScore(position: number, word: string): number {
    const scoreMap = this.wordScoresPerPosition.get(position);
    return scoreMap?.get(word) || 0.01; // Default low score
  }

  /**
   * Filter last words by position 12 poem constraints
   */
  private filterLastWordsByConstraints(words: string[]): string[] {
    if (!this.position12Constraints) {
      return words;
    }

    const constraints = this.position12Constraints.constraints;
    const filtered: string[] = [];

    // Load syllable counter synchronously (already loaded by this point)
    const syllable = require('syllable').syllable;

    for (const word of words) {
      let matches = true;

      // Check length (±1 tolerance)
      const lengthDiff = Math.abs(word.length - constraints.length);
      if (lengthDiff > 1) {
        matches = false;
      }

      // Check syllables
      if (matches && constraints.syllables > 0) {
        const wordSyllables = syllable(word);
        if (Math.abs(wordSyllables - constraints.syllables) > 1) {
          matches = false;
        }
      }

      // Check rhyme if specified
      if (matches && constraints.rhyme_with) {
        const rhymeWord = constraints.rhyme_with.toLowerCase();
        const w = word.toLowerCase();
        // Simple rhyme: last 2 characters match
        if (w.length >= 2 && rhymeWord.length >= 2) {
          if (w.slice(-2) !== rhymeWord.slice(-2)) {
            matches = false;
          }
        }
      }

      if (matches) {
        filtered.push(word);
      }
    }

    if (filtered.length > 0 && filtered.length < words.length) {
      logger.debug('Filtered position 12 words by constraints', {
        original: words.length,
        filtered: filtered.length,
        examples: filtered.slice(0, 5)
      });
    }

    // If too restrictive and filters out all words, return original list
    return filtered.length > 0 ? filtered : words;
  }

  /**
   * Generate seeds using simple combinatorial approach (fallback)
   */
  static generateCombinatorial(
    candidatesPerPosition: Map<number, string[]>,
    maxResults: number = 1000
  ): string[] {
    const seeds: string[] = [];
    const positions = Array.from({ length: 11 }, (_, i) => i + 1);

    // Generate random combinations
    for (let i = 0; i < maxResults * 10; i++) {
      const words: string[] = [];
      
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
        const validLastWords = ChecksumValidator.findValidLastWords(words);
        
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
  getSearchSpaceSize(candidatesPerPosition: Map<number, string[]>): number {
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
