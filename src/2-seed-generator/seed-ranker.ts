/**
 * Seed phrase ranking based on linguistic and probabilistic scoring
 */

import { SeedCheckTask } from '../types';
import { logger } from '../utils/logger';

export interface SeedScore {
  mnemonic: string;
  totalScore: number;
  wordScores: number[];
  rank: number;
}

export class SeedRanker {
  /**
   * Rank seed phrases by their combined word scores
   */
  static rankSeeds(
    seeds: string[],
    wordScoresPerPosition: Map<number, Map<string, number>>
  ): SeedScore[] {
    const scored: SeedScore[] = [];

    for (const seed of seeds) {
      const words = seed.split(' ');
      const wordScores: number[] = [];
      let totalScore = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const positionScores = wordScoresPerPosition.get(i + 1);
        const score = positionScores?.get(word) || 0.01; // Default low score
        
        wordScores.push(score);
        totalScore += score;
      }

      // Average score
      totalScore = totalScore / words.length;

      scored.push({
        mnemonic: seed,
        totalScore,
        wordScores,
        rank: 0
      });
    }

    // Sort by total score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    scored.forEach((item, index) => {
      item.rank = index + 1;
    });

    logger.debug('Ranked seeds', {
      totalSeeds: scored.length,
      topScore: scored[0]?.totalScore.toFixed(4),
      bottomScore: scored[scored.length - 1]?.totalScore.toFixed(4)
    });

    return scored;
  }

  /**
   * Convert ranked seeds to task format
   */
  static toTasks(rankedSeeds: SeedScore[]): SeedCheckTask[] {
    return rankedSeeds.map(seed => ({
      mnemonic: seed.mnemonic,
      probability: seed.totalScore,
      rank: seed.rank
    }));
  }

  /**
   * Filter seeds by minimum score threshold
   */
  static filterByThreshold(
    rankedSeeds: SeedScore[],
    minScore: number
  ): SeedScore[] {
    return rankedSeeds.filter(seed => seed.totalScore >= minScore);
  }

  /**
   * Get top-k seeds
   */
  static getTopK(rankedSeeds: SeedScore[], k: number): SeedScore[] {
    return rankedSeeds.slice(0, k);
  }

  /**
   * Calculate diversity score for a set of seeds
   */
  static calculateDiversity(seeds: string[]): number {
    const allWords = seeds.flatMap(seed => seed.split(' '));
    const uniqueWords = new Set(allWords);
    
    return uniqueWords.size / allWords.length;
  }

  /**
   * Deduplicate seeds
   */
  static deduplicate(seeds: string[]): string[] {
    return [...new Set(seeds)];
  }

  /**
   * Sort tasks by probability (highest first)
   */
  static sortTasksByProbability(tasks: SeedCheckTask[]): SeedCheckTask[] {
    return tasks.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Calculate confidence interval for scores
   */
  static getScoreStatistics(rankedSeeds: SeedScore[]): {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    if (rankedSeeds.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
    }

    const scores = rankedSeeds.map(s => s.totalScore);
    const sorted = [...scores].sort((a, b) => a - b);

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, stdDev, min, max };
  }

  /**
   * Group seeds by score ranges
   */
  static groupByScoreRange(
    rankedSeeds: SeedScore[],
    ranges: number[]
  ): Map<string, SeedScore[]> {
    const groups = new Map<string, SeedScore[]>();

    for (const seed of rankedSeeds) {
      let rangeKey = 'other';
      
      for (let i = 0; i < ranges.length; i++) {
        const min = ranges[i];
        const max = ranges[i + 1] || Infinity;
        
        if (seed.totalScore >= min && seed.totalScore < max) {
          rangeKey = `${min}-${max}`;
          break;
        }
      }

      if (!groups.has(rangeKey)) {
        groups.set(rangeKey, []);
      }
      groups.get(rangeKey)!.push(seed);
    }

    return groups;
  }
}
