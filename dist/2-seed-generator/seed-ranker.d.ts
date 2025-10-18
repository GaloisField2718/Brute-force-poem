/**
 * Seed phrase ranking based on linguistic and probabilistic scoring
 */
import { SeedCheckTask } from '../types';
export interface SeedScore {
    mnemonic: string;
    totalScore: number;
    wordScores: number[];
    rank: number;
}
export declare class SeedRanker {
    /**
     * Rank seed phrases by their combined word scores
     */
    static rankSeeds(seeds: string[], wordScoresPerPosition: Map<number, Map<string, number>>): SeedScore[];
    /**
     * Convert ranked seeds to task format
     */
    static toTasks(rankedSeeds: SeedScore[]): SeedCheckTask[];
    /**
     * Filter seeds by minimum score threshold
     */
    static filterByThreshold(rankedSeeds: SeedScore[], minScore: number): SeedScore[];
    /**
     * Get top-k seeds
     */
    static getTopK(rankedSeeds: SeedScore[], k: number): SeedScore[];
    /**
     * Calculate diversity score for a set of seeds
     */
    static calculateDiversity(seeds: string[]): number;
    /**
     * Deduplicate seeds
     */
    static deduplicate(seeds: string[]): string[];
    /**
     * Sort tasks by probability (highest first)
     */
    static sortTasksByProbability(tasks: SeedCheckTask[]): SeedCheckTask[];
    /**
     * Calculate confidence interval for scores
     */
    static getScoreStatistics(rankedSeeds: SeedScore[]): {
        mean: number;
        median: number;
        stdDev: number;
        min: number;
        max: number;
    };
    /**
     * Group seeds by score ranges
     */
    static groupByScoreRange(rankedSeeds: SeedScore[], ranges: number[]): Map<string, SeedScore[]>;
}
//# sourceMappingURL=seed-ranker.d.ts.map