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
        temperature: 0.7, // INCREASED for more variability
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

    return `You are a poetry expert analyzing a Bitcoin seed phrase hidden in a poem. The poem tells a story of liberation from prison.

**COMPLETE POEM CONTEXT:**
"In freedom of thought, I dream beyond _____'s wall,
Losing through loss yet learning what ____s call.
To sell a moment, then ______ it from time,
An empty heart echoes — a ______ without rhyme.
I've had insufficient hope of ______ to be still,
Once released from the current, now _____ by will.
The soothe becomes ____ in the rush of the night,
The individual drifts into the ______'s soft light.
From work to ____, from misleading to ______,
A salad becomes _____ — both fortune and fate.
And life, like warm soup or sweet _____ at ease,
Is richest when tasted uncertain — to please."

**STORY ANALYSIS:**
- Line 1: "dream beyond _____'s wall" → PRISON (obvious!)
- Line 2: "what ____s call" → PROFIT (financial gain!)
- Line 3: "then ______ it from time" → PURCHASE (buy/acquire!)
- Line 4: "a ______ without rhyme" → POETRY (poetic expression!)
- Line 5: "hope of ______ to be still" → PEACE (tranquility!)
- Line 6: "now _____ by will" → GUIDED (controlled!)
- Line 7: "becomes ____ in the night" → DARK (darkness!)
- Line 8: "the ______'s soft light" → CELESTIAL (heavenly!)
- Line 9: "From work to ____" → REST (leisure!)
- Line 10: "from misleading to ______" → TRUTH (honesty!)
- Line 11: "becomes _____ — both fortune and fate" → VALUABLE (precious!)
- Line 12: "sweet _____ at ease" → FOOD (comfort!)

**Current Position Context:**
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

**CRITICAL INSTRUCTIONS:**
1. The poem is about ESCAPING PRISON - think "prison", "profit", "purchase", "poetry", "peace", "guided", "dark", "celestial", "rest", "truth", "valuable", "food"
2. Look for words that fit the STORY, not just technical constraints
3. Consider the NARRATIVE FLOW from prison → liberation → transformation
4. Prioritize SEMANTIC MEANING over technical matching
5. Return the top 5 words ranked by story fit

**EXPECTED SEED PHRASE PATTERN (EXAMPLES ONLY):**
The Bitcoin seed phrase likely follows this semantic pattern (these are EXAMPLES, not the actual words):
- Position 1: "prison" (dream beyond prison's wall) - EXAMPLE of prison-related word
- Position 2: "profit" (what profit calls) - EXAMPLE of financial gain word
- Position 3: "purchase" (then purchase it from time) - EXAMPLE of acquisition word
- Position 4: "poetry" (without rhyme) - EXAMPLE of poetic expression word
- Position 5: "peace" (hope of peace to be still) - EXAMPLE of tranquility word
- Position 6: "guided" (now guided by will) - EXAMPLE of controlled word
- Position 7: "dark" (becomes dark in the night) - EXAMPLE of darkness word
- Position 8: "celestial" (the celestial's soft light) - EXAMPLE of heavenly word
- Position 9: "rest" (from work to rest) - EXAMPLE of leisure word
- Position 10: "truth" (from misleading to truth) - EXAMPLE of honesty word
- Position 11: "valuable" (becomes valuable) - EXAMPLE of precious word
- Position 12: "food" (sweet food at ease) - EXAMPLE of comfort word

**IMPORTANT:** These are SEMANTIC EXAMPLES to guide your analysis. You must find the actual BIP39 words that match these meanings from the candidate list provided.

**Response Format (JSON only, no markdown):**
[
  {"word": "actual_bip39_word", "score": 0.95, "reason": "Perfect semantic fit for prison theme"},
  {"word": "actual_bip39_word", "score": 0.90, "reason": "Good semantic fit for financial gain theme"},
  {"word": "actual_bip39_word", "score": 0.85, "reason": "Good semantic fit for acquisition theme"},
  {"word": "actual_bip39_word", "score": 0.80, "reason": "Good semantic fit for poetic expression theme"},
  {"word": "actual_bip39_word", "score": 0.75, "reason": "Good semantic fit for tranquility theme"}
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
