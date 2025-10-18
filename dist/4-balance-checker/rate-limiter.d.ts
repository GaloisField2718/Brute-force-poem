/**
 * Rate limiter using Bottleneck
 */
import Bottleneck from 'bottleneck';
import { ApiEndpoint } from '../types';
export declare class RateLimiter {
    private limiters;
    /**
     * Create a rate limiter for an API endpoint
     */
    createLimiter(endpoint: ApiEndpoint): Bottleneck;
    /**
     * Get limiter for an endpoint
     */
    getLimiter(endpointName: string): Bottleneck | undefined;
    /**
     * Execute a function with rate limiting
     */
    execute<T>(endpointName: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Check if limiter has capacity
     */
    hasCapacity(endpointName: string): boolean;
    /**
     * Get current counts for an endpoint
     */
    getCounts(endpointName: string): Bottleneck.Counts | null;
    /**
     * Stop all limiters
     */
    stopAll(): Promise<void>;
}
//# sourceMappingURL=rate-limiter.d.ts.map