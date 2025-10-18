"use strict";
/**
 * Configuration management and environment variables
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
dotenv.config();
class Config {
    // OpenRouter Configuration
    static OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
    static OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    static OPENROUTER_MODEL = 'anthropic/claude-3.5-sonnet';
    // Logging
    static LOG_LEVEL = process.env.LOG_LEVEL || 'info';
    static LOG_DIR = path.join(process.cwd(), 'logs');
    // Performance
    static WORKER_COUNT = parseInt(process.env.WORKER_COUNT || '8', 10);
    static BEAM_WIDTH = parseInt(process.env.BEAM_WIDTH || '200', 10);
    static TOP_K_PER_POSITION = parseInt(process.env.TOP_K_PER_POSITION || '15', 10);
    static MAX_SEEDS_TO_CHECK = parseInt(process.env.MAX_SEEDS_TO_CHECK || '10000', 10);
    // API Configuration
    static API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
    static API_RETRY_MAX_ATTEMPTS = parseInt(process.env.API_RETRY_MAX_ATTEMPTS || '3', 10);
    static API_BLACKLIST_DURATION_MS = 60000; // 60 seconds
    // Target
    static TARGET_BALANCE_SATS = parseInt(process.env.TARGET_BALANCE_SATS || '100000', 10);
    // Cache Configuration
    static CACHE_TTL_MS = 300000; // 5 minutes
    // Paths
    static POEM_CONFIG_PATH = path.join(process.cwd(), 'config', 'poem.json');
    static API_CONFIG_PATH = path.join(process.cwd(), 'config', 'api-endpoints.json');
    static RESULTS_DIR = path.join(process.cwd(), 'results');
    /**
     * Load poem configuration from JSON file
     */
    static loadPoemConfig() {
        try {
            const data = fs.readFileSync(this.POEM_CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to load poem config: ${error}`);
        }
    }
    /**
     * Load API endpoints configuration from JSON file
     */
    static loadApiConfig() {
        try {
            const data = fs.readFileSync(this.API_CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to load API config: ${error}`);
        }
    }
    /**
     * Validate configuration and ensure required values are present
     */
    static validate() {
        const errors = [];
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
exports.Config = Config;
