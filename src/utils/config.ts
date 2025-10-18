/**
 * Configuration management and environment variables
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { PoemConfig, ApiConfig } from '../types';

dotenv.config();

export class Config {
  // OpenRouter Configuration
  static readonly OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  static readonly OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
  static readonly OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';

  // Logging
  static readonly LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  static readonly LOG_DIR = path.join(process.cwd(), 'logs');

  // Performance
  static readonly WORKER_COUNT = parseInt(process.env.WORKER_COUNT || '8', 10);
  static readonly BEAM_WIDTH = parseInt(process.env.BEAM_WIDTH || '200', 10);
  static readonly TOP_K_PER_POSITION = parseInt(process.env.TOP_K_PER_POSITION || '3', 10);
  static readonly MAX_SEEDS_TO_CHECK = parseInt(process.env.MAX_SEEDS_TO_CHECK || '10000', 10);

  // API Configuration
  static readonly API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
  static readonly API_RETRY_MAX_ATTEMPTS = parseInt(process.env.API_RETRY_MAX_ATTEMPTS || '3', 10);
  static readonly API_BLACKLIST_DURATION_MS = 60000; // 60 seconds

  // Target
  static readonly TARGET_BALANCE_SATS = parseInt(process.env.TARGET_BALANCE_SATS || '100000', 10);

  // Cache Configuration
  static readonly CACHE_TTL_MS = 300000; // 5 minutes

  // Paths
  static readonly POEM_CONFIG_PATH = path.join(process.cwd(), 'config', 'poem.json');
  static readonly API_CONFIG_PATH = path.join(process.cwd(), 'config', 'api-endpoints.json');
  static readonly RESULTS_DIR = path.join(process.cwd(), 'results');

  /**
   * Load poem configuration from JSON file
   */
  static loadPoemConfig(): PoemConfig {
    try {
      const data = fs.readFileSync(this.POEM_CONFIG_PATH, 'utf-8');
      return JSON.parse(data) as PoemConfig;
    } catch (error) {
      throw new Error(`Failed to load poem config: ${error}`);
    }
  }

  /**
   * Load API endpoints configuration from JSON file
   */
  static loadApiConfig(): ApiConfig {
    try {
      const data = fs.readFileSync(this.API_CONFIG_PATH, 'utf-8');
      return JSON.parse(data) as ApiConfig;
    } catch (error) {
      throw new Error(`Failed to load API config: ${error}`);
    }
  }

  /**
   * Validate configuration and ensure required values are present
   */
  static validate(): void {
    const errors: string[] = [];

    if (!this.OPENROUTER_API_KEY) {
      errors.push('OPENROUTER_API_KEY is required');
    }

    if (!fs.existsSync(this.POEM_CONFIG_PATH)) {
      errors.push(`Poem config file not found: ${this.POEM_CONFIG_PATH}`);
    }

    if (!fs.existsSync(this.API_CONFIG_PATH)) {
      errors.push(`API config file not found: ${this.API_CONFIG_PATH}`);
    }

    // Create directories if they don't exist
    [this.LOG_DIR, this.RESULTS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }
}
