/**
 * Beam search for generating optimal seed phrases
 */
import { ScoredCandidate } from '../types';
export declare class BeamSearch {
    private beamWidth;
    private wordScoresPerPosition;
    constructor(beamWidth: number);
    /**
     * Set word scores for all positions
     */
    setWordScores(scoredCandidates: Map<number, ScoredCandidate[]>): void;
    /**
     * Run beam search to generate top-k seed phrases
     */
    search(candidatesPerPosition: Map<number, string[]>, maxResults?: number): string[];
    /**
     * Expand beam by one position
     */
    private expandBeam;
    /**
     * Get score for a word at a specific position
     */
    private getWordScore;
    /**
     * Generate seeds using simple combinatorial approach (fallback)
     */
    static generateCombinatorial(candidatesPerPosition: Map<number, string[]>, maxResults?: number): string[];
    /**
     * Get statistics about the search space
     */
    getSearchSpaceSize(candidatesPerPosition: Map<number, string[]>): number;
}
//# sourceMappingURL=beam-search.d.ts.map