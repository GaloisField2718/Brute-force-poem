"use strict";
/**
 * Rate limiter using Bottleneck
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const bottleneck_1 = __importDefault(require("bottleneck"));
class RateLimiter {
    limiters = new Map();
    /**
     * Create a rate limiter for an API endpoint
     */
    createLimiter(endpoint) {
        const limiter = new bottleneck_1.default({
            reservoir: endpoint.rateLimit.requestsPerSecond,
            reservoirRefreshAmount: endpoint.rateLimit.requestsPerSecond,
            reservoirRefreshInterval: 1000, // 1 second
            maxConcurrent: 5,
            minTime: 1000 / endpoint.rateLimit.requestsPerSecond
        });
        this.limiters.set(endpoint.name, limiter);
        return limiter;
    }
    /**
     * Get limiter for an endpoint
     */
    getLimiter(endpointName) {
        return this.limiters.get(endpointName);
    }
    /**
     * Execute a function with rate limiting
     */
    async execute(endpointName, fn) {
        const limiter = this.limiters.get(endpointName);
        if (!limiter) {
            throw new Error(`No limiter found for endpoint: ${endpointName}`);
        }
        return limiter.schedule(fn);
    }
    /**
     * Check if limiter has capacity
     */
    hasCapacity(endpointName) {
        const limiter = this.limiters.get(endpointName);
        if (!limiter)
            return false;
        const counts = limiter.counts();
        return counts.EXECUTING < 5; // maxConcurrent
    }
    /**
     * Get current counts for an endpoint
     */
    getCounts(endpointName) {
        const limiter = this.limiters.get(endpointName);
        return limiter ? limiter.counts() : null;
    }
    /**
     * Stop all limiters
     */
    async stopAll() {
        const promises = Array.from(this.limiters.values()).map(limiter => limiter.stop({ dropWaitingJobs: true }));
        await Promise.all(promises);
    }
}
exports.RateLimiter = RateLimiter;
