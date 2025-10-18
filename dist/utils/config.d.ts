/**
 * Configuration management and environment variables
 */
import { PoemConfig, ApiConfig } from '../types';
export declare class Config {
    static readonly OPENROUTER_API_KEY: string;
    static readonly OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    static readonly OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";
    static readonly LOG_LEVEL: string;
    static readonly LOG_DIR: string;
    static readonly WORKER_COUNT: number;
    static readonly BEAM_WIDTH: number;
    static readonly TOP_K_PER_POSITION: number;
    static readonly MAX_SEEDS_TO_CHECK: number;
    static readonly API_TIMEOUT_MS: number;
    static readonly API_RETRY_MAX_ATTEMPTS: number;
    static readonly API_BLACKLIST_DURATION_MS = 60000;
    static readonly TARGET_BALANCE_SATS: number;
    static readonly CACHE_TTL_MS = 300000;
    static readonly POEM_CONFIG_PATH: string;
    static readonly API_CONFIG_PATH: string;
    static readonly RESULTS_DIR: string;
    /**
     * Load poem configuration from JSON file
     */
    static loadPoemConfig(): PoemConfig;
    /**
     * Load API endpoints configuration from JSON file
     */
    static loadApiConfig(): ApiConfig;
    /**
     * Validate configuration and ensure required values are present
     */
    static validate(): void;
}
//# sourceMappingURL=config.d.ts.map