/**
 * Beam search for generating optimal seed phrases
 */

import { BeamSearchState, ScoredCandidate } from '../types';
import { ChecksumValidator } from './checksum-validator';
import { logger } from '../utils/logger';

export class BeamSearch {
  private beamWidth: number;
  private wordScoresPerPosition: Map<number, Map<string, number>> = new Map();

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
   * Run beam search to generate top-k seed phrases
   */
  search(
    candidatesPerPosition: Map<number, string[]>,
    maxResults: number = 10000
  ): string[] {
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

    for (const state of beam) {
      if (state.partialSeed.length !== 11) {
        continue;
      }

      const validLastWords = ChecksumValidator.findValidLastWords(state.partialSeed);
      
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
    logger.info('Beam search complete', {
      totalSeeds: results.length,
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
