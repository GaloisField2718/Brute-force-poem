/**
 * OpenRouter API client for linguistic analysis
 */
import { PoemBlank, ScoredCandidate } from '../types';
export declare class OpenRouterClient {
    private client;
    private apiKey;
    constructor();
    /**
     * Score BIP39 words for a specific poem context
     */
    scoreWords(blank: PoemBlank, candidateWords: string[]): Promise<ScoredCandidate[]>;
    /**
     * Build prompt for Claude
     */
    private buildPrompt;
    /**
     * Parse OpenRouter response
     */
    private parseResponse;
    /**
     * Batch score multiple positions
     */
    scoreMultiplePositions(blanks: PoemBlank[], candidatesPerPosition: Map<number, string[]>): Promise<Map<number, ScoredCandidate[]>>;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Test API connection
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=openrouter-client.d.ts.map