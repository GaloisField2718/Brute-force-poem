/**
 * OpenRouter API client for linguistic analysis
 */

import axios, { AxiosInstance } from 'axios';
import { Config } from '../utils/config';
import { PoemBlank, ScoredCandidate } from '../types';
import { logger } from '../utils/logger';

export class OpenRouterClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = Config.OPENROUTER_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: Config.OPENROUTER_BASE_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/bitcoin-seed-recovery',
        'X-Title': 'Bitcoin Seed Recovery',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Score BIP39 words for a specific poem context
   */
  async scoreWords(
    blank: PoemBlank,
    candidateWords: string[]
  ): Promise<ScoredCandidate[]> {
    const prompt = this.buildPrompt(blank, candidateWords);

    try {
      const response = await this.client.post('/chat/completions', {
        model: Config.OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: 'You are a linguistic expert analyzing poetry to determine the best word fits. Return only valid JSON without markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      // Validate response structure
      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error('Invalid response structure from OpenRouter API');
      }

      const content = response.data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response content from OpenRouter API');
      }
      
      // Parse JSON response
      const scored = this.parseResponse(content);

      logger.debug('OpenRouter scoring complete', {
        position: blank.position,
        candidatesScored: scored.length,
        topWord: scored[0]?.word
      });

      return scored;
    } catch (error: any) {
      logger.error('OpenRouter API error', {
        error: error.message,
        position: blank.position,
        status: error.response?.status
      });

      // Fallback: return words with equal scores
      return candidateWords.map((word, index) => ({
        word,
        score: 1.0 - (index * 0.01), // Slight decreasing scores
        reason: 'Fallback scoring due to API error'
      }));
    }
  }

  /**
   * Build prompt for Claude
   */
  private buildPrompt(blank: PoemBlank, candidateWords: string[]): string {
    const { context, constraints } = blank;

    return `Analyze this poetic context and rank the following BIP39 words by how well they fit.

**Poetic Context:**
"${context}"

**Blank Position:** ${blank.position}

**Constraints:**
- Length: ${constraints.length} letters
- Syllables: ${constraints.syllables}
- Pattern: ${constraints.pattern}
${constraints.rhyme_with ? `- Rhymes with: "${constraints.rhyme_with}"` : ''}
- Semantic domains: ${constraints.semantic_domain.join(', ')}

**BIP39 Candidate Words:**
${candidateWords.join(', ')}

**Instructions:**
1. Evaluate each word based on:
   - Poetic fit and natural flow
   - Semantic appropriateness
   - Rhyme and rhythm
   - Constraint satisfaction
2. Return the top 15 words ranked by probability
3. Provide a brief reason for each word's score

**Response Format (JSON only, no markdown):**
[
  {"word": "example", "score": 0.95, "reason": "Perfect semantic and rhythmic fit"},
  {"word": "another", "score": 0.87, "reason": "Good fit but slightly less natural"},
  ...
]

Return ONLY the JSON array, nothing else.`;
  }

  /**
   * Parse OpenRouter response
   */
  private parseResponse(content: string): ScoredCandidate[] {
    try {
      // Remove markdown code blocks if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map(item => ({
        word: item.word,
        score: item.score || 0.5,
        reason: item.reason || 'No reason provided'
      }));
    } catch (error) {
      logger.error('Failed to parse OpenRouter response', {
        error: String(error),
        content: content.substring(0, 200)
      });
      return [];
    }
  }

  /**
   * Batch score multiple positions
   */
  async scoreMultiplePositions(
    blanks: PoemBlank[],
    candidatesPerPosition: Map<number, string[]>
  ): Promise<Map<number, ScoredCandidate[]>> {
    const results = new Map<number, ScoredCandidate[]>();

    // Process sequentially to avoid rate limits
    for (const blank of blanks) {
      const candidates = candidatesPerPosition.get(blank.position);
      
      if (!candidates || candidates.length === 0) {
        logger.warn('No candidates for position', { position: blank.position });
        continue;
      }

      const scored = await this.scoreWords(blank, candidates);
      results.set(blank.position, scored);

      // Small delay to respect rate limits
      await this.sleep(500);
    }

    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: Config.OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Reply with "OK"'
          }
        ]
      });

      return response.status === 200;
    } catch (error) {
      logger.error('OpenRouter connection test failed', { error: String(error) });
      return false;
    }
  }
}
