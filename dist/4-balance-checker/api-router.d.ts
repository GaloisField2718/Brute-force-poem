/**
 * API Router with intelligent rotation and fallback
 */
import { ApiEndpoint } from '../types';
export declare class ApiRouter {
    private endpoints;
    private clients;
    private rateLimiter;
    private healthStatus;
    private currentIndex;
    private cache;
    constructor(endpoints: ApiEndpoint[]);
    /**
     * Initialize API clients and rate limiters
     */
    private initializeClients;
    /**
     * Get next available endpoint using round-robin with health checks
     */
    private getNextAvailableEndpoint;
    /**
     * Check balance for an address with automatic failover
     */
    checkBalance(address: string): Promise<number>;
    /**
     * Execute API call with retry logic
     */
    private executeWithRetry;
    /**
     * Update health status for an endpoint
     */
    private updateHealth;
    /**
     * Get health status for all endpoints
     */
    getHealthStatus(): Record<string, string>;
    /**
     * Check balances for multiple addresses
     */
    checkBalances(addresses: string[]): Promise<Map<string, number>>;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Stop all rate limiters and clean up resources
     */
    stop(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStatistics(): {
        size: number;
        oldestEntry: number | null;
    };
}
//# sourceMappingURL=api-router.d.ts.map